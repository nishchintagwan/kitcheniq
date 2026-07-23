// agmarknet-sync — Daily price sync from Agmarknet API
//
// Trigger: Daily cron at 06:00 IST (00:30 UTC)
// Configure via Supabase Dashboard → Edge Functions → agmarknet-sync → Schedule
// Cron expression: 30 0 * * *
//
// Required secrets (set via Supabase Dashboard → Settings → Secrets):
//   AGMARKNET_API_KEY — data.gov.in API key
//   SUPABASE_URL      — injected automatically
//   SUPABASE_SERVICE_ROLE_KEY — injected automatically

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const AGMARKNET_API_KEY = Deno.env.get('AGMARKNET_API_KEY') ?? ''
const AGMARKNET_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070'
const SPIKE_THRESHOLD = 0.15   // 15% change triggers a kb_alerts row
const CITY = 'pune'

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
  if (!AGMARKNET_API_KEY) {
    console.error('agmarknet-sync: AGMARKNET_API_KEY secret is not set')
    return new Response(
      JSON.stringify({ error: 'AGMARKNET_API_KEY not configured' }),
      { status: 200 }  // always 200 — never 500 that crashes the client
    )
  }

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
      { status: 200 }
    )
  }

  console.log(`agmarknet-sync: processing ${ingredients.length} ingredients`)

  // Process each ingredient independently — never abort on single failure
  for (const ingredient of ingredients as KbIngredient[]) {
    const result = await syncIngredient(ingredient)
    results.push(result)

    // Log every run to kb_sync_log (best-effort, don't abort on log failure)
    await supabase.from('kb_sync_log').insert({
      kb_ingredient_id: ingredient.id,
      city: CITY,
      status: result.status,
      recorded_at: new Date().toISOString(),
    }).then(() => {}, (e) => console.error('kb_sync_log insert failed:', e))
  }

  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    no_data: results.filter(r => r.status === 'no_data').length,
    error: results.filter(r => r.status === 'error').length,
    spikes: results.filter(r => r.spike_detected).length,
  }

  console.log('agmarknet-sync: complete', JSON.stringify(summary))
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

    const response = await fetch(`${AGMARKNET_BASE}?${params}`, {
      headers: { Accept: 'application/json' },
    })

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

    // Step 4 — extract modal price (₹/quintal) and convert to retail ₹/kg
    const modalPrice = Number(data.records[0].modal_price)
    const retailPrice = Math.round((modalPrice / 100) * ingredient.retail_multiplier * 100) / 100

    if (!retailPrice || retailPrice <= 0 || isNaN(retailPrice)) {
      return {
        ...base,
        status: 'error',
        error_message: `Invalid computed price: ${retailPrice} (modal: ${modalPrice})`,
      }
    }

    // Step 5 — fetch most recent history price for spike detection
    const { data: historyRows } = await supabase
      .from('kb_ingredient_price_history')
      .select('price_per_kg')
      .eq('kb_ingredient_id', ingredient.id)
      .eq('city', CITY)
      .order('recorded_at', { ascending: false })
      .limit(1)

    const previousPrice: number | null = (historyRows as { price_per_kg: number }[] | null)?.[0]?.price_per_kg ?? null

    // Step 6 — upsert live price (one row per ingredient per city)
    const { error: upsertError } = await supabase
      .from('kb_ingredient_prices')
      .upsert(
        {
          kb_ingredient_id: ingredient.id,
          city: CITY,
          price_per_kg: retailPrice,
          source: 'agmarknet',
          recorded_at: new Date().toISOString(),
        },
        { onConflict: 'kb_ingredient_id,city' }
      )

    if (upsertError) {
      return {
        ...base,
        status: 'error',
        error_message: `Upsert failed: ${upsertError.message}`,
      }
    }

    // Step 7 — append to immutable price history log
    await supabase.from('kb_ingredient_price_history').insert({
      kb_ingredient_id: ingredient.id,
      city: CITY,
      price_per_kg: retailPrice,
      source: 'agmarknet',
      recorded_at: new Date().toISOString(),
    })

    // Step 8 — spike detection (≥15% change from previous price)
    let spikeDetected = false
    if (previousPrice !== null) {
      const changePct = Math.abs(retailPrice - previousPrice) / previousPrice
      if (changePct >= SPIKE_THRESHOLD) {
        spikeDetected = true
        console.log(
          `SPIKE: ${ingredient.name} ₹${previousPrice} → ₹${retailPrice} (${Math.round(changePct * 100)}%)`
        )

        await supabase.from('kb_alerts').insert({
          kb_ingredient_id: ingredient.id,
          city: CITY,
          previous_price: previousPrice,
          new_price: retailPrice,
          change_pct: Math.round(changePct * 100),
          triggered_at: new Date().toISOString(),
        }).then(() => {}, (e) => console.error('kb_alerts insert failed:', e))
      }
    }

    return {
      ...base,
      status: 'success',
      new_price: retailPrice,
      previous_price: previousPrice ?? undefined,
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
