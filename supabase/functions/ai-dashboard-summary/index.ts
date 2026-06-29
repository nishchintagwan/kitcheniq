// AI dashboard summary — generates a 1–2 sentence plain-English menu insight.
// Caches result in ai_insights for 6 hours to avoid repeated Claude calls.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CACHE_HOURS = 6

interface DishInput {
  name: string
  category: string
  marginPercent: number
  status: 'healthy' | 'watch' | 'critical'
  profitPerDish: number
  sellingPrice: number
}

interface CachedRow {
  id: string
  message: string
}

function ok200(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function readCache(
  supabaseUrl: string,
  serviceKey: string,
  restaurantId: string,
): Promise<string | null> {
  try {
    const cutoff = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString()
    const url = new URL(`${supabaseUrl}/rest/v1/ai_insights`)
    url.searchParams.set('restaurant_id', `eq.${restaurantId}`)
    url.searchParams.set('insight_type', 'eq.dashboard_summary')
    url.searchParams.set('dismissed_at', 'is.null')
    url.searchParams.set('created_at', `gt.${cutoff}`)
    url.searchParams.set('order', 'created_at.desc')
    url.searchParams.set('limit', '1')
    url.searchParams.set('select', 'id,message')

    const res = await fetch(url.toString(), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!res.ok) return null
    const rows = (await res.json()) as CachedRow[]
    return rows.length > 0 ? rows[0].message : null
  } catch {
    return null
  }
}

async function writeCache(
  supabaseUrl: string,
  serviceKey: string,
  restaurantId: string,
  summary: string,
  dishCount: number,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/ai_insights`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        insight_type: 'dashboard_summary',
        message: summary,
        data: { dish_count: dishCount, generated_at: new Date().toISOString() },
      }),
    })
  } catch {
    // Cache write failure is non-fatal
  }
}

async function callClaude(apiKey: string, dishes: DishInput[]): Promise<string> {
  const critical  = dishes.filter((d) => d.status === 'critical')
  const watch     = dishes.filter((d) => d.status === 'watch')
  const healthy   = dishes.filter((d) => d.status === 'healthy')

  const dishLines = dishes
    .map((d) => `${d.name}: ${d.marginPercent.toFixed(1)}% margin (${d.status}), ₹${Math.round(d.profitPerDish)} profit`)
    .join('\n')

  const userMessage =
    `Restaurant has ${dishes.length} dishes total: ${healthy.length} healthy, ${watch.length} watch, ${critical.length} critical.\n\n` +
    `Dish details:\n${dishLines}`

  const systemPrompt =
    'You are an AI advisor for an Indian restaurant owner. ' +
    'Write a 1-2 sentence plain English insight about their menu performance right now. ' +
    'Be specific — name actual dishes. Be direct. No marketing language. ' +
    "Example: '3 dishes are losing money. Dal Makhani has the worst margin at 18% — raise the price or cut cream.' " +
    'Return ONLY the insight text, no JSON, no formatting.'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return ((data?.content?.[0]?.text as string) ?? '').trim()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey      = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  let restaurantId: string
  let dishes: DishInput[]

  try {
    const body = await req.json()
    restaurantId = String(body.restaurantId ?? '').trim()
    dishes = Array.isArray(body.dishes) ? (body.dishes as DishInput[]) : []
    if (!restaurantId) return ok200({ summary: '', cached: false })
  } catch {
    return ok200({ summary: '', cached: false })
  }

  // 0-dish case: return static message, no Claude call
  if (dishes.length === 0) {
    return ok200({
      summary: 'Add your first dishes to get AI insights',
      cached: false,
    })
  }

  // Check cache first
  if (supabaseUrl && serviceKey) {
    const cached = await readCache(supabaseUrl, serviceKey, restaurantId)
    if (cached) {
      return ok200({ summary: cached, cached: true })
    }
  }

  // No cache — call Claude
  if (!apiKey) {
    return ok200({ summary: 'Calculating your menu performance...', cached: false })
  }

  let summary: string
  try {
    summary = await callClaude(apiKey, dishes)
  } catch (err) {
    console.error('[ai-dashboard-summary] Claude error:', err)
    return ok200({ summary: 'Calculating your menu performance...', cached: false })
  }

  if (!summary) {
    return ok200({ summary: 'Calculating your menu performance...', cached: false })
  }

  // Persist to cache
  if (supabaseUrl && serviceKey) {
    await writeCache(supabaseUrl, serviceKey, restaurantId, summary, dishes.length)
  }

  return ok200({ summary, cached: false })
})
