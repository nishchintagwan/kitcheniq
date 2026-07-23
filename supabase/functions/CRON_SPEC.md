# Agmarknet Price Sync — Cron Edge Function Spec

**File:** `supabase/functions/agmarknet-sync/index.ts`  
**Trigger:** Daily cron at 6:00 AM IST (00:30 UTC)  
**Purpose:** Fetch live wholesale modal prices from Agmarknet, convert to retail, upsert into `kb_ingredient_prices`, detect spikes, log run.

---

## API details

**Endpoint:**
```
GET https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
```

**Key parameters:**

| Parameter | Value | Notes |
|---|---|---|
| `api-key` | `{AGMARKNET_API_KEY}` | Store as Supabase secret |
| `format` | `json` | |
| `filters[state]` | `Maharashtra` | |
| `filters[market]` | `Pune APMC` | Exact string — case sensitive |
| `filters[commodity]` | `{agmarknet_commodity}` | From `kb_ingredients` — see below |
| `limit` | `10` | One commodity at a time, limit 10 is sufficient |

**Important:** The API filters by commodity **name string**, not a numeric code. The exact string must match what Agmarknet uses — e.g. `Ginger(Green)` not `Ginger`, `Peas Wet` not `Peas`, `Gur(Jaggery)` not `Jaggery`.

**Example call — Tomato:**
```
https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
  ?api-key=YOUR_KEY
  &format=json
  &filters[state]=Maharashtra
  &filters[market]=Pune%20APMC
  &filters[commodity]=Tomato
  &limit=10
```

**Response structure:**
```json
{
  "status": "ok",
  "total": 1,
  "records": [
    {
      "state": "Maharashtra",
      "district": "Pune",
      "market": "Pune APMC",
      "commodity": "Tomato",
      "variety": "Local",
      "grade": "Local",
      "arrival_date": "23/07/2026",
      "min_price": 1000,
      "max_price": 2000,
      "modal_price": 1500
    }
  ]
}
```

**Price unit:** `modal_price` is in **₹/quintal** (1 quintal = 100 kg). Always divide by 100 before storing.

---

## Price conversion formula

```
retail_price_per_kg = (modal_price / 100) * retail_multiplier
```

`retail_multiplier` is stored per ingredient in `kb_ingredients`. Never hardcode it.

**Example — Tomato:**
```
modal_price      = 1500  (₹/quintal)
÷ 100            = 15.00 (₹/kg wholesale)
× 1.40           = 21.00 (₹/kg retail — stored in kb_ingredient_prices)
```

---

## Cron sequence (8 steps)

### Step 1 — Fetch ingredients to sync
```sql
SELECT id, name, agmarknet_commodity, agmarknet_market, retail_multiplier
FROM kb_ingredients
WHERE agmarknet_commodity IS NOT NULL
  AND is_active = true;
```

Only ingredients with a non-null `agmarknet_commodity` are synced. All others (`manual_seed`, `fixed_mrp`) are skipped.

### Step 2 — Call Agmarknet API per ingredient

For each ingredient from Step 1, call the API with:
- `filters[commodity]` = `agmarknet_commodity`
- `filters[market]` = `agmarknet_market` (e.g. `Pune APMC`)
- `filters[state]` = `Maharashtra`

Handle three response states:
- `records.length > 0` → proceed to Step 3
- `records.length === 0` → log `status = 'no_data'`, skip to Step 8
- Network/API error → log `status = 'error'`, skip to Step 8

### Step 3 — Extract modal price

```typescript
const modalPrice = records[0].modal_price; // ₹/quintal
```

If multiple records returned (same commodity, different varieties), take the first record. Agmarknet typically returns one record per commodity per market per day.

### Step 4 — Convert to retail price

```typescript
const retailPricePerKg = (modalPrice / 100) * ingredient.retail_multiplier;
const roundedPrice = Math.round(retailPricePerKg * 100) / 100; // 2 decimal places
```

### Step 5 — Fetch previous price (for spike detection)

```sql
SELECT price_per_kg
FROM kb_ingredient_price_history
WHERE kb_ingredient_id = $1
  AND city = 'pune'
ORDER BY recorded_at DESC
LIMIT 1;
```

### Step 6 — Upsert into kb_ingredient_prices

```sql
INSERT INTO kb_ingredient_prices
  (kb_ingredient_id, city, price_per_kg, source, recorded_at)
VALUES
  ($1, 'pune', $2, 'agmarknet', now())
ON CONFLICT (kb_ingredient_id, city)
DO UPDATE SET
  price_per_kg = EXCLUDED.price_per_kg,
  source       = EXCLUDED.source,
  recorded_at  = now();
```

### Step 7 — Append to kb_ingredient_price_history

```sql
INSERT INTO kb_ingredient_price_history
  (kb_ingredient_id, city, price_per_kg, source, recorded_at)
VALUES
  ($1, 'pune', $2, 'agmarknet', now());
```

Never update history rows. Only insert. This table is the immutable audit log.

### Step 8 — Spike detection

```typescript
if (previousPrice) {
  const changePct = Math.abs(newPrice - previousPrice) / previousPrice;
  if (changePct >= 0.15) {
    // Insert into alerts table
    await supabase.from('alerts').insert({
      kb_ingredient_id: ingredient.id,
      city: 'pune',
      previous_price: previousPrice,
      new_price: newPrice,
      change_pct: Math.round(changePct * 100),
      triggered_at: new Date().toISOString(),
    });
  }
}
```

Threshold: **≥15% change** triggers an alert. This feeds the price spike alert feature on the dashboard.

### Step 9 — Log run to kb_sync_log

```sql
INSERT INTO kb_sync_log
  (kb_ingredient_id, city, status, recorded_at)
VALUES
  ($1, 'pune', $2, now());
```

`status` values: `'success'` | `'no_data'` | `'error'`

---

## Error handling

| Scenario | Action |
|---|---|
| API returns empty records | Log `no_data`, keep existing price, continue to next ingredient |
| API returns HTTP error | Log `error` with message, continue to next ingredient |
| Conversion produces NaN or negative | Log `error`, skip upsert |
| Supabase upsert fails | Log `error`, continue — don't abort entire run |

Never abort the full cron run on a single ingredient failure. Process all ingredients independently.

---

## Environment variables

Store as Supabase secrets — never hardcode:

| Secret | Description |
|---|---|
| `AGMARKNET_API_KEY` | data.gov.in API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |

---

## Cron schedule

Set in `supabase/config.toml`:

```toml
[functions.agmarknet-sync]
schedule = "30 0 * * *"  # 00:30 UTC = 06:00 IST daily
```

---

## Pre-launch checklist

Before the first cron run, verify every `agmarknet_commodity` string in `kb_ingredients` against the live API:

1. Register at data.gov.in and get your API key
2. Query all commodities for Pune APMC:
   ```
   ?api-key=YOUR_KEY&format=json&filters[state]=Maharashtra&filters[market]=Pune%20APMC&limit=200
   ```
3. Extract all commodity name strings from the response
4. Cross-check each `agmarknet_commodity` value in `kb_ingredients`:
   ```sql
   SELECT name, agmarknet_commodity, agmarknet_market
   FROM kb_ingredients
   WHERE agmarknet_commodity IS NOT NULL
   ORDER BY category, name;
   ```
5. For any mismatches, update before going live:
   ```sql
   UPDATE kb_ingredients
   SET agmarknet_commodity = 'correct-string-from-api'
   WHERE name = 'ingredient-name';
   ```

**Pay special attention to:**
- Pulses — formal Agmarknet names differ significantly from common names
- Vegetables that appear in sub-markets only (Khadiki, Moshi, Pimpri) — may not appear in `Pune APMC` filter
- Ingredients confirmed not in Pune APMC (currently `null`) — these are skipped by the cron automatically

---

## Commodity strings verified as of 23-Jul-2026

These were confirmed against the live Pune APMC API response:

| KB ingredient | Agmarknet commodity string | Market |
|---|---|---|
| Tomato | `Tomato` | Pune APMC |
| Onion | `Onion` | Pune APMC |
| Potato | `Potato` | Pune APMC |
| Garlic | `Garlic` | Pune APMC |
| Ginger | `Ginger(Green)` | Pune APMC |
| Green Chilli | `Green Chilli` | Pune APMC |
| Capsicum | `Chilly Capsicum` | Pune APMC |
| Cauliflower | `Cauliflower` | Pune APMC |
| Cabbage | `Cabbage` | Pune APMC |
| Spinach | `Spinach` | Pune APMC |
| Fenugreek Leaves | `Methi(Leaves)` | Pune APMC |
| Peas | `Peas Wet` | Pune APMC |
| Brinjal | `Brinjal` | Pune APMC |
| Drumstick | `Drumstick` | Pune APMC |
| Bottle Gourd | `Bottle gourd` | Pune APMC |
| Ridge Gourd | `Ridgeguard(Tori)` | Pune APMC |
| Bitter Gourd | `Bitter gourd` | Pune APMC |
| Lemon | `Lime` | Pune APMC |
| Coriander | `Coriander(Leaves)` | Pune APMC |
| Spring Onion | `Onion Green` | Pune APMC |
| Beetroot | `Beetroot` | Pune APMC |
| Carrot | `Carrot` | Pune APMC |
| Jowar Flour | `Jowar(Sorghum)` | Pune APMC |
| Ragi Flour | `Ragi(Finger Millet)` | Pune APMC |
| Urad Dal | `Black Gram(Urd Beans)(Whole)` | Pune APMC |
| Moong Dal Green | `Green Gram(Moong)(Whole)` | Pune APMC |
| Masoor Dal | `Lentil(Masur)(Whole)` | Pune APMC |
| Kabuli Chana | `Bengal Gram(Gram)(Whole)` | Pune APMC |
| Jaggery | `Gur(Jaggery)` | Pune APMC |
| Coconut Fresh | `Tender Coconut` | Pune APMC |

---

## Ingredients not tracked by Agmarknet (agmarknet_commodity = null)

These use `manual_seed` prices and are never touched by the cron. Prices should be reviewed and updated manually every quarter:

- All dairy (Paneer, Butter, Ghee, Cream, Milk etc.)
- All proteins (Chicken, Mutton, Fish, Eggs, Prawns)
- All processed grains (Basmati Rice, Atta, Maida, Besan, Poha etc.)
- All spices (Cumin, Turmeric, Cardamom, Black Pepper etc.)
- All oils (Refined Oil, Mustard Oil, Coconut Oil etc.)
- All nuts (Cashew, Almond, Raisins)
- All continental/packaged items (Pasta, Schezwan Sauce, Olive Oil etc.)
- Curry Leaves, Raw Banana, Bok Choy, Bean Sprouts
