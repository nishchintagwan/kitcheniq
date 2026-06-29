// AI tip generator — one actionable margin improvement tip per dish.
// Only fires for watch/critical dishes. Caches result for 24 hours.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CACHE_HOURS = 24
const CLAUDE_TIMEOUT_MS = 3000

interface MarginResult {
  rawCost: number
  wastageCost: number
  overheadCost: number
  totalCost: number
  marginPercent: number
  profitPerDish: number
  status: 'healthy' | 'watch' | 'critical'
}

interface Recipe {
  id: string
  name: string
  category: string
  selling_price: number
  wastage_percent: number
  overhead_percent: number
  serves: number
}

interface IngredientRow {
  quantity: number
  unit: string
  ingredients: { name: string; price_per_kg: number } | null
}

interface CachedRow {
  tip_text: string
}

function ok200(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function ingredientCostPerServe(
  quantity: number,
  unit: string,
  pricePerKg: number,
  serves: number,
): number {
  const multipliers: Record<string, number> = {
    kg: 1, gram: 0.001, litre: 1, ml: 0.001, piece: 1, dozen: 12,
  }
  return quantity * (multipliers[unit] ?? 1) * pricePerKg / Math.max(serves, 1)
}

async function readCache(
  supabaseUrl: string,
  serviceKey: string,
  recipeId: string,
): Promise<string | null> {
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/ai_tips`)
    url.searchParams.set('recipe_id', `eq.${recipeId}`)
    url.searchParams.set('expires_at', `gt.${new Date().toISOString()}`)
    url.searchParams.set('order', 'created_at.desc')
    url.searchParams.set('limit', '1')
    url.searchParams.set('select', 'tip_text')
    const res = await fetch(url.toString(), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!res.ok) return null
    const rows = (await res.json()) as CachedRow[]
    return rows.length > 0 ? rows[0].tip_text : null
  } catch {
    return null
  }
}

async function writeCache(
  supabaseUrl: string,
  serviceKey: string,
  recipeId: string,
  tip: string,
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000).toISOString()
    await fetch(`${supabaseUrl}/rest/v1/ai_tips`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        recipe_id: recipeId,
        tip_text: tip,
        expires_at: expiresAt,
      }),
    })
  } catch {
    // Cache write failure is non-fatal — tip still returned to caller
  }
}

async function fetchIngredientRows(
  supabaseUrl: string,
  serviceKey: string,
  recipeId: string,
): Promise<IngredientRow[]> {
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/recipe_ingredients`)
    url.searchParams.set('recipe_id', `eq.${recipeId}`)
    url.searchParams.set('select', 'quantity,unit,ingredients(name,price_per_kg)')
    const res = await fetch(url.toString(), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!res.ok) return []
    return (await res.json()) as IngredientRow[]
  } catch {
    return []
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey      = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  let recipeId: string
  let recipe: Recipe
  let margin: MarginResult

  try {
    const body = await req.json()
    recipeId = String(body.recipeId ?? '').trim()
    recipe   = body.recipe as Recipe
    margin   = body.margin as MarginResult
    if (!recipeId || !recipe?.name || !margin?.status) return ok200({ tip: null })
  } catch {
    return ok200({ tip: null })
  }

  // Only generate tips for watch or critical dishes
  if (margin.status === 'healthy') {
    return ok200({ tip: null })
  }

  // Check 24-hour cache before calling Claude
  if (supabaseUrl && serviceKey) {
    const cached = await readCache(supabaseUrl, serviceKey, recipeId)
    if (cached) return ok200({ tip: cached })
  }

  if (!apiKey) return ok200({ tip: null })

  // Fetch per-ingredient cost breakdown for a richer prompt
  const rows = supabaseUrl && serviceKey
    ? await fetchIngredientRows(supabaseUrl, serviceKey, recipeId)
    : []

  const ingredientLines = rows
    .map((row) => {
      if (!row.ingredients) return null
      const cost = ingredientCostPerServe(row.quantity, row.unit, row.ingredients.price_per_kg, recipe.serves)
      return `- ${row.ingredients.name}: ${row.quantity} ${row.unit} → ₹${cost.toFixed(2)}/serve`
    })
    .filter(Boolean)
    .join('\n')

  const userMessage =
    `Dish: ${recipe.name} (${recipe.category})\n` +
    `Selling price: ₹${recipe.selling_price} | Serves: ${recipe.serves}\n` +
    `Wastage: ${recipe.wastage_percent}% | Overhead: ${recipe.overhead_percent}%\n\n` +
    (ingredientLines ? `Ingredients per serve:\n${ingredientLines}\n\n` : '') +
    `Margin: ${margin.marginPercent.toFixed(1)}% (${margin.status})\n` +
    `Total cost: ₹${margin.totalCost.toFixed(2)} | Profit: ₹${margin.profitPerDish.toFixed(2)}/serve`

  const systemPrompt =
    'You are a restaurant profit advisor. Give one specific, actionable tip to improve the margin on this dish. ' +
    'Be concrete — mention actual rupee amounts and specific ingredients. Max 2 sentences. No generic advice. ' +
    "Example: 'Reduce fresh cream from 100ml to 70ml to save ₹12 per plate, lifting margin from 22% to 31%.'"

  // Hard 3-second timeout — if Claude is slow, caller gets { tip: null } and the UI shows nothing
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS)

  let tip: string
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    })

    if (!claudeRes.ok) {
      console.error('[ai-tip] Anthropic returned', claudeRes.status)
      return ok200({ tip: null })
    }

    const data = await claudeRes.json()
    tip = ((data?.content?.[0]?.text as string) ?? '').trim()
  } catch (err) {
    // AbortError means timeout; any other error is a network/API failure
    console.error('[ai-tip] Claude call failed:', err)
    return ok200({ tip: null })
  } finally {
    clearTimeout(timeout)
  }

  if (!tip) return ok200({ tip: null })

  // Persist to cache — expires_at is exactly now() + 24 hours
  if (supabaseUrl && serviceKey) {
    await writeCache(supabaseUrl, serviceKey, recipeId, tip)
  }

  return ok200({ tip })
})
