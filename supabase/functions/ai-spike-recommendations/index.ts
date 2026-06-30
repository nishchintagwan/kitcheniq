// ai-spike-recommendations — per-recipe actions when an ingredient price spikes.
// Called fire-and-forget from ingredientStore after a ≥15% price change is detected.
// Calls Claude once with all affected recipes; saves each recommendation to ai_insights.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CLAUDE_TIMEOUT_MS = 5000

interface AffectedRecipe {
  recipeId: string
  recipeName: string
  oldMargin: number
  newMargin: number
}

interface Recommendation {
  recipe_id: string
  action: string
}

function ok200(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function saveRecommendations(
  supabaseUrl: string,
  serviceKey: string,
  restaurantId: string,
  ingredientId: string,
  ingredientName: string,
  previousPrice: number,
  newPrice: number,
  changePercent: number,
  recommendations: Recommendation[],
): Promise<void> {
  if (recommendations.length === 0) return

  const rows = recommendations.map((rec) => ({
    restaurant_id: restaurantId,
    insight_type: 'spike_alert',
    recipe_id: rec.recipe_id,
    message: rec.action,
    data: {
      ingredientId,
      ingredientName,
      previousPrice,
      newPrice,
      changePercent,
    },
  }))

  try {
    await fetch(`${supabaseUrl}/rest/v1/ai_insights`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    })
  } catch {
    // Non-fatal — recommendations are still returned to the caller
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey      = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  let restaurantId: string
  let ingredientId: string
  let ingredientName: string
  let previousPrice: number
  let newPrice: number
  let changePercent: number
  let affectedRecipes: AffectedRecipe[]

  try {
    const body = await req.json()
    restaurantId   = String(body.restaurantId ?? '').trim()
    ingredientId   = String(body.ingredientId ?? '').trim()
    ingredientName = String(body.ingredientName ?? '').trim()
    previousPrice  = Number(body.previousPrice)
    newPrice       = Number(body.newPrice)
    changePercent  = Number(body.changePercent)
    affectedRecipes = Array.isArray(body.affectedRecipes) ? body.affectedRecipes : []

    if (!restaurantId || !ingredientId || !ingredientName || affectedRecipes.length === 0) {
      return ok200({ recommendations: [] })
    }
  } catch {
    return ok200({ recommendations: [] })
  }

  if (!apiKey) {
    return ok200({ recommendations: [] })
  }

  const direction = changePercent > 0 ? 'increased' : 'decreased'
  const pct = Math.abs(Math.round(changePercent))
  const sign = changePercent > 0 ? '+' : '-'

  const recipeLines = affectedRecipes
    .map(
      (r) =>
        `- ${r.recipeName} (recipe_id: ${r.recipeId}): margin was ${r.oldMargin.toFixed(1)}%, now ${r.newMargin.toFixed(1)}%`,
    )
    .join('\n')

  const userMessage =
    `Ingredient: ${ingredientName}\n` +
    `Price ${direction}: ₹${previousPrice} → ₹${newPrice} (${sign}${pct}%)\n\n` +
    `Affected dishes:\n${recipeLines}\n\n` +
    `For each dish above, give ONE specific action to restore or protect margin. ` +
    `Return ONLY valid JSON matching this exact shape:\n` +
    `{ "recommendations": [{ "recipe_id": "<id>", "action": "<action>" }] }`

  const systemPrompt =
    'You are a restaurant profit advisor. An ingredient price has spiked. ' +
    'For each affected dish, give ONE specific action in plain English. ' +
    'Format your response as JSON only — no markdown, no explanation, no code fences: ' +
    '{ "recommendations": [{ "recipe_id": string, "action": string }] }. ' +
    'Actions must be specific: name the dish, name the ingredient, give rupee amounts or gram quantities. ' +
    "Example action: 'Raise Butter Chicken price to ₹320 or reduce tomato from 200g to 140g per plate to restore margin above 40%.' " +
    'One action per dish. No generic advice.'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS)

  let recommendations: Recommendation[] = []

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
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    })

    if (!claudeRes.ok) {
      console.error('[ai-spike-recommendations] Anthropic returned', claudeRes.status)
      return ok200({ recommendations: [] })
    }

    const data = await claudeRes.json()
    const raw = ((data?.content?.[0]?.text as string) ?? '').trim()

    // Strip markdown code fences if Claude wraps the JSON
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed?.recommendations)) {
      recommendations = parsed.recommendations.filter(
        (r: unknown) =>
          typeof (r as Recommendation).recipe_id === 'string' &&
          typeof (r as Recommendation).action === 'string',
      )
    }
  } catch (err) {
    console.error('[ai-spike-recommendations] Claude call failed:', err)
    return ok200({ recommendations: [] })
  } finally {
    clearTimeout(timeout)
  }

  if (supabaseUrl && serviceKey && recommendations.length > 0) {
    await saveRecommendations(
      supabaseUrl,
      serviceKey,
      restaurantId,
      ingredientId,
      ingredientName,
      previousPrice,
      newPrice,
      changePercent,
      recommendations,
    )
  }

  return ok200({ recommendations })
})
