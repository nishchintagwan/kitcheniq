# KitchenIQ — KB Post-Migration Build Plan

> **For Claude Code.** Execute all tasks autonomously. Loop on errors without asking for input unless a blocker is explicitly marked **[STOP — HUMAN INPUT REQUIRED]**. All decisions are pre-made. Follow the sequence exactly.

---

## Context

The KB migration has been run. The following tables now exist in Supabase:

- `kb_ingredients` — 123 ingredients, shared master list
- `kb_ingredient_prices` — Pune baseline prices seeded
- `kb_ingredient_price_history` — empty, will fill as cron runs
- `ingredient_library` — existing table, now has `kb_ingredient_id` FK column
- `ingredients` — existing per-restaurant table, now has `kb_ingredient_id` FK column

Three things need to be built, in this order:

1. **kb-matcher** — Edge Function: triggered on `ingredients` insert, fuzzy-matches to `kb_ingredients`, sets `kb_ingredient_id`
2. **Price resolution** — update existing margin calculation to use KB price when owner price is stale
3. **agmarknet-sync** — Edge Function: daily cron at 6 AM IST, fetches live prices, updates KB, detects spikes

---

## Pre-flight checks

Before writing any code, do all of the following:

```bash
# 1. Confirm KB tables exist and are populated
supabase db execute --sql "SELECT count(*) FROM kb_ingredients;"
# Expected: 123

supabase db execute --sql "SELECT count(*) FROM kb_ingredient_prices WHERE city = 'pune';"
# Expected: 123

supabase db execute --sql "SELECT count(*) FROM ingredient_library WHERE kb_ingredient_id IS NOT NULL;"
# Expected: ~40 (all existing library rows linked)

# 2. Confirm kb_ingredient_id column exists on both tables
supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'ingredients' AND column_name = 'kb_ingredient_id';"
supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'ingredient_library' AND column_name = 'kb_ingredient_id';"

# 3. Confirm existing functions directory structure
ls supabase/functions/
```

If any check fails, fix the underlying issue (re-run migration, check schema) before proceeding. Do not continue with broken pre-conditions.

---

## Task 1 — kb-matcher Edge Function

### What it does
Triggers on every `INSERT` into the `ingredients` table. Fuzzy-matches the new ingredient's name against `kb_ingredients.name`. If a match is found, sets `kb_ingredient_id` on the new row. If no match, leaves null — the owner manages price manually.

### Matching logic
- Exact match (case-insensitive, trimmed) → always accept
- If no exact match, try these normalisation rules in order:
  1. Strip common suffixes: `(fresh)`, `(dry)`, `(whole)`, `(split)`, `(salted)`, `(unsalted)`
  2. Strip trailing words after `/` — e.g. `Chicken/Murgi` → `Chicken`
  3. Try starts-with match — e.g. `Paneer (homemade)` matches `Paneer`
- Accept first match found. If still no match after all rules → leave `kb_ingredient_id` null, log unmatched name
- Never block the insert. Matching is best-effort, always async, never throws

### File to create
`supabase/functions/kb-matcher/index.ts`

Match the structure and import style of existing Edge Functions in the project exactly.

### Implementation

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()

    // Only handle INSERT events on ingredients table
    if (payload.type !== 'INSERT' || payload.table !== 'ingredients') {
      return new Response('ignored', { status: 200 })
    }

    const ingredient = payload.record
    if (!ingredient?.id || !ingredient?.name) {
      return new Response('invalid payload', { status: 400 })
    }

    // Already linked — nothing to do
    if (ingredient.kb_ingredient_id) {
      return new Response('already linked', { status: 200 })
    }

    // Fetch all KB ingredients for matching
    const { data: kbIngredients, error } = await supabase
      .from('kb_ingredients')
      .select('id, name')
      .eq('is_active', true)

    if (error || !kbIngredients) {
      console.error('Failed to fetch kb_ingredients:', error)
      return new Response('kb fetch failed', { status: 500 })
    }

    const matched = findMatch(ingredient.name, kbIngredients)

    if (matched) {
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ kb_ingredient_id: matched.id })
        .eq('id', ingredient.id)

      if (updateError) {
        console.error('Failed to update kb_ingredient_id:', updateError)
        return new Response('update failed', { status: 500 })
      }

      console.log(`Matched '${ingredient.name}' → '${matched.name}' (${matched.id})`)
      return new Response(JSON.stringify({ matched: matched.name }), { status: 200 })
    }

    // No match found — log and continue
    console.log(`No KB match found for: '${ingredient.name}'`)
    return new Response(JSON.stringify({ matched: null }), { status: 200 })

  } catch (err) {
    console.error('kb-matcher error:', err)
    return new Response('internal error', { status: 500 })
  }
})

function normalise(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\(.*?\)\s*/g, '')   // remove anything in brackets
    .replace(/\/.*$/, '')             // remove everything after /
    .trim()
}

function findMatch(
  rawName: string,
  kbIngredients: { id: string; name: string }[]
): { id: string; name: string } | null {
  const input = rawName.toLowerCase().trim()

  // Pass 1: exact match (case-insensitive)
  const exact = kbIngredients.find(k => k.name.toLowerCase() === input)
  if (exact) return exact

  // Pass 2: normalised exact match
  const normInput = normalise(rawName)
  const normExact = kbIngredients.find(k => normalise(k.name) === normInput)
  if (normExact) return normExact

  // Pass 3: starts-with match on normalised name
  const startsWith = kbIngredients.find(k =>
    normInput.startsWith(normalise(k.name)) ||
    normalise(k.name).startsWith(normInput)
  )
  if (startsWith) return startsWith

  return null
}
```

### Database trigger to create

After creating the function file, create the database webhook trigger so it fires on every `ingredients` insert:

```sql
-- Run in Supabase SQL editor after deploying the function
CREATE OR REPLACE FUNCTION trigger_kb_matcher()
RETURNS trigger AS $$
BEGIN
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/kb-matcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'ingredients',
        'record', row_to_json(NEW)
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ingredient_insert
  AFTER INSERT ON ingredients
  FOR EACH ROW EXECUTE FUNCTION trigger_kb_matcher();
```

If the `pg_net` extension is not enabled, enable it first:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Alternatively, configure the trigger as a Supabase Database Webhook via the dashboard (Table: `ingredients`, Event: `INSERT`, URL: `{SUPABASE_URL}/functions/v1/kb-matcher`). Either approach is acceptable — use whichever matches how existing webhooks are configured in the project.

### Verification
After deploying:
```bash
# 1. Deploy the function
supabase functions deploy kb-matcher

# 2. Insert a test ingredient and confirm kb_ingredient_id is set
supabase db execute --sql "
  INSERT INTO ingredients (id, restaurant_id, name, unit, current_price_per_unit, category)
  SELECT
    gen_random_uuid(),
    id,
    'Tomato Test',
    'kg',
    40.00,
    'Vegetables'
  FROM restaurants LIMIT 1
  RETURNING id, name, kb_ingredient_id;
"

# 3. Confirm the inserted row has kb_ingredient_id set
# kb_ingredient_id should be non-null and match the Tomato row in kb_ingredients

# 4. Clean up test row
supabase db execute --sql "DELETE FROM ingredients WHERE name = 'Tomato Test';"
```

---

## Task 2 — Price resolution in margin calculation

### What it does
Updates the existing margin calculation logic to use KB price when the owner's `current_price_per_unit` has not been updated within 7 days.

### Price resolution rule
```
if ingredients.price_updated_at >= now() - interval '7 days'
  → use ingredients.current_price_per_unit
else if ingredients.kb_ingredient_id is not null
  → use kb_ingredient_prices.price_per_kg for restaurant's city
else
  → use ingredients.current_price_per_unit (flag as stale in response)
```

### Step 1 — Find the margin calculation

Locate the existing margin calculation. It will be one of:
- A Supabase view (`recipe_margins` as defined in the schema doc)
- An Edge Function
- A combination of both

Check both:
```bash
# Check for the view
supabase db execute --sql "SELECT definition FROM pg_views WHERE viewname = 'recipe_margins';"

# Check functions directory
ls supabase/functions/
```

### Step 2 — Update the view (if margin is calculated in the view)

Replace the existing `recipe_margins` view with a version that uses KB price as fallback:

```sql
CREATE OR REPLACE VIEW recipe_margins AS
SELECT
  r.id,
  r.name,
  r.selling_price,
  r.restaurant_id,
  r.serves,
  r.wastage_percent,
  r.overhead_percent,

  -- Resolved price: owner price if fresh (<7 days), else KB price, else owner price regardless
  -- Also flags whether KB price was used
  SUM(
    ri.quantity *
    CASE
      WHEN i.price_updated_at >= now() - interval '7 days'
        THEN i.current_price_per_unit
      WHEN i.kb_ingredient_id IS NOT NULL AND kp.price_per_kg IS NOT NULL
        THEN kp.price_per_kg
      ELSE i.current_price_per_unit
    END
  ) / r.serves AS raw_cost_per_portion,

  -- Flag: true if any ingredient used a stale price (>7 days, no KB fallback)
  BOOL_OR(
    i.price_updated_at < now() - interval '7 days'
    AND i.kb_ingredient_id IS NULL
  ) AS has_stale_price,

  -- Flag: true if any ingredient used KB price as fallback
  BOOL_OR(
    i.price_updated_at < now() - interval '7 days'
    AND i.kb_ingredient_id IS NOT NULL
    AND kp.price_per_kg IS NOT NULL
  ) AS used_kb_price,

  round(
    (
      SUM(
        ri.quantity *
        CASE
          WHEN i.price_updated_at >= now() - interval '7 days'
            THEN i.current_price_per_unit
          WHEN i.kb_ingredient_id IS NOT NULL AND kp.price_per_kg IS NOT NULL
            THEN kp.price_per_kg
          ELSE i.current_price_per_unit
        END
      ) / r.serves
    ) * (1 + r.wastage_percent / 100 + r.overhead_percent / 100),
    2
  ) AS total_cost_per_portion,

  round(
    (
      r.selling_price -
      (
        SUM(
          ri.quantity *
          CASE
            WHEN i.price_updated_at >= now() - interval '7 days'
              THEN i.current_price_per_unit
            WHEN i.kb_ingredient_id IS NOT NULL AND kp.price_per_kg IS NOT NULL
              THEN kp.price_per_kg
            ELSE i.current_price_per_unit
          END
        ) / r.serves
      ) * (1 + r.wastage_percent / 100 + r.overhead_percent / 100)
    ) / r.selling_price * 100,
    2
  ) AS margin_percent

FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredients i ON i.id = ri.ingredient_id
LEFT JOIN restaurants res ON res.id = r.restaurant_id
LEFT JOIN kb_ingredient_prices kp
  ON kp.kb_ingredient_id = i.kb_ingredient_id
  AND kp.city = COALESCE(res.city, 'pune')
GROUP BY
  r.id, r.name, r.selling_price, r.restaurant_id,
  r.serves, r.wastage_percent, r.overhead_percent;
```

Notes on this view:
- `LEFT JOIN kb_ingredient_prices` on both `kb_ingredient_id` and `city` — uses the restaurant's city from the `restaurants` table, falls back to `'pune'` if city is null
- `has_stale_price` flag surfaces in the API response so the frontend can show "price may be outdated" UI
- `used_kb_price` flag tells the frontend KB pricing is active for this recipe
- If margin calculation lives in an Edge Function instead of a view, apply the same CASE logic to the price lookup in the TypeScript code

### Step 3 — Update TypeScript types

If the project has TypeScript types for the `recipe_margins` view (in `src/types/` or similar), add the two new boolean fields:

```typescript
export interface RecipeMargin {
  id: string
  name: string
  selling_price: number
  restaurant_id: string
  total_cost_per_portion: number
  margin_percent: number
  has_stale_price: boolean    // add this
  used_kb_price: boolean      // add this
}
```

### Verification
```bash
supabase db execute --sql "
  SELECT
    name,
    selling_price,
    total_cost_per_portion,
    margin_percent,
    has_stale_price,
    used_kb_price
  FROM recipe_margins
  LIMIT 5;
"
```

Confirm:
- `margin_percent` values are plausible (10–70% range for typical dishes)
- `has_stale_price` and `used_kb_price` columns exist in the result
- No null values in `total_cost_per_portion` or `margin_percent`

---

## Task 3 — agmarknet-sync Edge Function

### What it does
Runs daily at 6 AM IST. For each ingredient in `kb_ingredients` with a non-null `agmarknet_commodity`, fetches the current modal price from the Agmarknet API, converts to retail price, upserts into `kb_ingredient_prices`, appends to `kb_ingredient_price_history`, detects price spikes ≥15%, and logs the run.

### File to create
`supabase/functions/agmarknet-sync/index.ts`

Match structure and import style of existing functions exactly.

### API reference
- Endpoint: `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`
- Prices returned in ₹/quintal — always divide by 100 before storing
- Filter by `commodity` name string (not numeric code) — see CRON_SPEC.md for full details
- Market string: `Pune APMC` (exact, case-sensitive, URL-encode space as `%20`)

### Implementation

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const AGMARKNET_API_KEY = Deno.env.get('AGMARKNET_API_KEY')!
const AGMARKNET_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070'
const SPIKE_THRESHOLD = 0.15  // 15%

interface KbIngredient {
  id: string
  name: string
  agmarknet_commodity: string
  agmarknet_market: string
  retail_multiplier: number
}

interface SyncResult {
  ingredient_id: string
  name: string
  status: 'success' | 'no_data' | 'error'
  new_price?: number
  previous_price?: number
  spike_detected?: boolean
  error_message?: string
}

Deno.serve(async (_req) => {
  console.log('agmarknet-sync: starting run')
  const results: SyncResult[] = []

  // Step 1 — fetch all Agmarknet-tracked ingredients
  const { data: ingredients, error: fetchError } = await supabase
    .from('kb_ingredients')
    .select('id, name, agmarknet_commodity, agmarknet_market, retail_multiplier')
    .not('agmarknet_commodity', 'is', null)
    .eq('is_active', true)

  if (fetchError || !ingredients) {
    console.error('Failed to fetch kb_ingredients:', fetchError)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch ingredients' }),
      { status: 500 }
    )
  }

  console.log(`agmarknet-sync: processing ${ingredients.length} ingredients`)

  // Process each ingredient independently — never abort on single failure
  for (const ingredient of ingredients as KbIngredient[]) {
    const result = await syncIngredient(ingredient)
    results.push(result)

    // Log to kb_sync_log
    await supabase.from('kb_sync_log').insert({
      kb_ingredient_id: ingredient.id,
      city: 'pune',
      status: result.status,
      recorded_at: new Date().toISOString(),
    })
  }

  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    no_data: results.filter(r => r.status === 'no_data').length,
    error: results.filter(r => r.status === 'error').length,
    spikes: results.filter(r => r.spike_detected).length,
  }

  console.log('agmarknet-sync: complete', summary)
  return new Response(JSON.stringify({ summary, results }), { status: 200 })
})

async function syncIngredient(ingredient: KbIngredient): Promise<SyncResult> {
  const base: SyncResult = {
    ingredient_id: ingredient.id,
    name: ingredient.name,
    status: 'error',
  }

  try {
    // Step 2 — call Agmarknet API
    const params = new URLSearchParams({
      'api-key': AGMARKNET_API_KEY,
      format: 'json',
      'filters[state]': 'Maharashtra',
      'filters[market]': ingredient.agmarknet_market,
      'filters[commodity]': ingredient.agmarknet_commodity,
      limit: '10',
    })

    const response = await fetch(`${AGMARKNET_BASE}?${params}`)

    if (!response.ok) {
      return {
        ...base,
        status: 'error',
        error_message: `API HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    // Step 3 — check for records
    if (!data.records || data.records.length === 0) {
      console.log(`no_data: ${ingredient.name} (${ingredient.agmarknet_commodity})`)
      return { ...base, status: 'no_data' }
    }

    // Step 4 — extract modal price and convert to retail
    const modalPrice = data.records[0].modal_price as number
    const retailPrice = Math.round((modalPrice / 100) * ingredient.retail_multiplier * 100) / 100

    if (!retailPrice || retailPrice <= 0 || isNaN(retailPrice)) {
      return {
        ...base,
        status: 'error',
        error_message: `Invalid computed price: ${retailPrice}`,
      }
    }

    // Step 5 — fetch previous price for spike detection
    const { data: historyRows } = await supabase
      .from('kb_ingredient_price_history')
      .select('price_per_kg')
      .eq('kb_ingredient_id', ingredient.id)
      .eq('city', 'pune')
      .order('recorded_at', { ascending: false })
      .limit(1)

    const previousPrice = historyRows?.[0]?.price_per_kg ?? null

    // Step 6 — upsert current price
    const { error: upsertError } = await supabase
      .from('kb_ingredient_prices')
      .upsert({
        kb_ingredient_id: ingredient.id,
        city: 'pune',
        price_per_kg: retailPrice,
        source: 'agmarknet',
        recorded_at: new Date().toISOString(),
      }, {
        onConflict: 'kb_ingredient_id,city',
      })

    if (upsertError) {
      return {
        ...base,
        status: 'error',
        error_message: `Upsert failed: ${upsertError.message}`,
      }
    }

    // Step 7 — append to history (immutable log)
    await supabase.from('kb_ingredient_price_history').insert({
      kb_ingredient_id: ingredient.id,
      city: 'pune',
      price_per_kg: retailPrice,
      source: 'agmarknet',
      recorded_at: new Date().toISOString(),
    })

    // Step 8 — spike detection
    let spikeDetected = false
    if (previousPrice) {
      const changePct = Math.abs(retailPrice - previousPrice) / previousPrice
      if (changePct >= SPIKE_THRESHOLD) {
        spikeDetected = true
        console.log(`SPIKE: ${ingredient.name} ${previousPrice} → ${retailPrice} (${Math.round(changePct * 100)}%)`)

        await supabase.from('alerts').insert({
          kb_ingredient_id: ingredient.id,
          city: 'pune',
          previous_price: previousPrice,
          new_price: retailPrice,
          change_pct: Math.round(changePct * 100),
          triggered_at: new Date().toISOString(),
        })
      }
    }

    return {
      ...base,
      status: 'success',
      new_price: retailPrice,
      previous_price: previousPrice,
      spike_detected: spikeDetected,
    }

  } catch (err) {
    console.error(`Error syncing ${ingredient.name}:`, err)
    return {
      ...base,
      status: 'error',
      error_message: String(err),
    }
  }
}
```

### Required secrets

Set these before deploying. Do not hardcode:

```bash
supabase secrets set AGMARKNET_API_KEY=your_data_gov_in_api_key
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by Supabase — no need to set them manually.

### Cron schedule

Add to `supabase/config.toml`:

```toml
[functions.agmarknet-sync]
schedule = "30 0 * * *"
```

This runs at 00:30 UTC = 06:00 IST daily.

### kb_sync_log table

The function writes to `kb_sync_log`. Create this table if it does not already exist:

```sql
CREATE TABLE IF NOT EXISTS kb_sync_log (
  id               uuid primary key default gen_random_uuid(),
  kb_ingredient_id uuid references kb_ingredients(id),
  city             text not null default 'pune',
  status           text not null check (status in ('success', 'no_data', 'error')),
  recorded_at      timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_kb_sync_log_lookup
  ON kb_sync_log (kb_ingredient_id, recorded_at desc);
```

### Deployment and verification

```bash
# 1. Deploy
supabase functions deploy agmarknet-sync

# 2. Trigger a manual test run
supabase functions invoke agmarknet-sync

# 3. Check results
supabase db execute --sql "
  SELECT
    k.name,
    p.price_per_kg,
    p.source,
    p.recorded_at
  FROM kb_ingredient_prices p
  JOIN kb_ingredients k ON k.id = p.kb_ingredient_id
  WHERE p.city = 'pune'
  ORDER BY p.recorded_at DESC
  LIMIT 20;
"

# 4. Check sync log
supabase db execute --sql "
  SELECT
    k.name,
    l.status,
    l.recorded_at
  FROM kb_sync_log l
  JOIN kb_ingredients k ON k.id = l.kb_ingredient_id
  ORDER BY l.recorded_at DESC
  LIMIT 30;
"

# 5. Confirm no error-status rows for common vegetables
supabase db execute --sql "
  SELECT k.name, l.status
  FROM kb_sync_log l
  JOIN kb_ingredients k ON k.id = l.kb_ingredient_id
  WHERE l.status = 'error'
  ORDER BY l.recorded_at DESC;
"
```

Expected after a successful test run:
- ~30 `success` rows (the Agmarknet-tracked ingredients)
- Some `no_data` rows for ingredients whose commodity string doesn't match today's Pune APMC arrivals — this is normal and not an error
- Zero `error` rows for common vegetables (Tomato, Onion, Potato, Garlic etc.)

If a common vegetable shows `error` status, check:
1. `AGMARKNET_API_KEY` secret is set correctly
2. The `agmarknet_commodity` string in `kb_ingredients` matches exactly what the API expects — query the live API manually to verify

---

## Execution order summary

```
Pre-flight checks
      ↓
Task 1: Deploy kb-matcher Edge Function
      ↓
Task 1: Create database trigger for ingredients INSERT
      ↓
Task 1: Verify with test ingredient insert
      ↓
Task 2: Locate existing margin calculation (view or function)
      ↓
Task 2: Update with KB price resolution logic
      ↓
Task 2: Update TypeScript types
      ↓
Task 2: Verify margin query returns correct columns and values
      ↓
Task 3: Create kb_sync_log table if missing
      ↓
Task 3: Set AGMARKNET_API_KEY secret
      ↓
Task 3: Deploy agmarknet-sync Edge Function
      ↓
Task 3: Add cron schedule to supabase/config.toml
      ↓
Task 3: Invoke manually and verify results
      ↓
Done
```

---

## Blocker conditions — stop and flag to human

Only stop and ask for human input if:

1. **[STOP]** `kb_ingredients` table does not exist or has 0 rows — migration has not run correctly
2. **[STOP]** `AGMARKNET_API_KEY` is not available and cannot be inferred from project config — need the key to proceed with Task 3
3. **[STOP]** The existing margin calculation cannot be located in either the view or any Edge Function — need guidance on where it lives before updating it
4. **[STOP]** The `alerts` table does not exist and its schema is unknown — need schema before inserting spike alerts

For all other errors (type errors, import issues, deploy failures, test assertion failures), loop and fix autonomously.
