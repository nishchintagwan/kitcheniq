// ai-menu-optimisation — weekly menu analysis: reprice / promote / remove actions.
// Receives only { restaurantId }. All recipe + margin data is fetched from the DB
// server-side so the caller cannot spoof margin numbers.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CLAUDE_TIMEOUT_MS = 15000

const UNIT_MULTIPLIERS: Record<string, number> = {
  kg: 1, gram: 0.001, litre: 1, ml: 0.001, piece: 1, dozen: 12,
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RecipeRow {
  id: string
  name: string
  category: string
  selling_price: number
  serves: number
  wastage_percent: number
  overhead_percent: number
  created_at: string
}

interface RIRow {
  recipe_id: string
  quantity: number
  unit: string
  ingredients: { price_per_kg: number } | null
}

interface RecipeWithMargin extends RecipeRow {
  marginPercent: number
  profitPerDish: number
  daysSinceCreated: number
}

interface ClaudeInsight {
  type: 'reprice' | 'promote' | 'remove'
  recipe_id: string
  message: string
  suggested_price?: number
  reason: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok200(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function computeMargin(recipe: RecipeRow, items: RIRow[]): { marginPercent: number; profitPerDish: number } {
  if (recipe.serves <= 0 || recipe.selling_price <= 0) {
    return { marginPercent: 0, profitPerDish: 0 }
  }
  const rawCost = items.reduce((sum, ri) => {
    const mult = UNIT_MULTIPLIERS[ri.unit] ?? 1
    return sum + ri.quantity * mult * (ri.ingredients?.price_per_kg ?? 0)
  }, 0) / recipe.serves

  const wastageCost  = rawCost * (recipe.wastage_percent  / 100)
  const overheadCost = rawCost * (recipe.overhead_percent / 100)
  const totalCost    = rawCost + wastageCost + overheadCost
  const marginPercent = (recipe.selling_price - totalCost) / recipe.selling_price * 100
  return { marginPercent, profitPerDish: recipe.selling_price - totalCost }
}

async function fetchRecipes(supabaseUrl: string, serviceKey: string, restaurantId: string): Promise<RecipeRow[]> {
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/recipes`)
    url.searchParams.set('restaurant_id', `eq.${restaurantId}`)
    url.searchParams.set('select', 'id,name,category,selling_price,serves,wastage_percent,overhead_percent,created_at')
    const res = await fetch(url.toString(), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!res.ok) return []
    return (await res.json()) as RecipeRow[]
  } catch {
    return []
  }
}

async function fetchRecipeIngredients(
  supabaseUrl: string,
  serviceKey: string,
  recipeIds: string[],
): Promise<RIRow[]> {
  if (recipeIds.length === 0) return []
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/recipe_ingredients`)
    url.searchParams.set('recipe_id', `in.(${recipeIds.join(',')})`)
    url.searchParams.set('select', 'recipe_id,quantity,unit,ingredients(price_per_kg)')
    const res = await fetch(url.toString(), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!res.ok) return []
    return (await res.json()) as RIRow[]
  } catch {
    return []
  }
}

async function deleteOldMenuInsights(supabaseUrl: string, serviceKey: string, restaurantId: string): Promise<void> {
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/ai_insights`)
    url.searchParams.set('restaurant_id', `eq.${restaurantId}`)
    url.searchParams.set('insight_type', 'in.(reprice,promote,remove)')
    url.searchParams.set('dismissed_at', 'is.null')
    await fetch(url.toString(), {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
  } catch {
    // Non-fatal — old insights may linger but new ones are still inserted
  }
}

async function insertInsights(
  supabaseUrl: string,
  serviceKey: string,
  rows: object[],
): Promise<void> {
  if (rows.length === 0) return
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
    // Non-fatal
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey      = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // ── 1. Parse request ──────────────────────────────────────────────────────
  let restaurantId: string
  try {
    const body = await req.json()
    restaurantId = String(body.restaurantId ?? '').trim()
    if (!restaurantId) return ok200({ insights: [] })
  } catch {
    return ok200({ insights: [] })
  }

  if (!supabaseUrl || !serviceKey) return ok200({ insights: [] })

  // ── 2. Fetch recipes from DB (not from request) ───────────────────────────
  const recipes = await fetchRecipes(supabaseUrl, serviceKey, restaurantId)

  if (recipes.length === 0) {
    return ok200({ insights: [] })
  }

  // ── 3. Fetch all recipe_ingredients + prices ──────────────────────────────
  const recipeIds = recipes.map((r) => r.id)
  const riRows    = await fetchRecipeIngredients(supabaseUrl, serviceKey, recipeIds)

  // Group by recipe_id
  const riByRecipe = new Map<string, RIRow[]>()
  for (const ri of riRows) {
    const arr = riByRecipe.get(ri.recipe_id) ?? []
    arr.push(ri)
    riByRecipe.set(ri.recipe_id, arr)
  }

  // ── 4. Compute margins server-side ────────────────────────────────────────
  const now = Date.now()
  const recipesWithMargin: RecipeWithMargin[] = recipes.map((r) => {
    const items = riByRecipe.get(r.id) ?? []
    const { marginPercent, profitPerDish } = computeMargin(r, items)
    const daysSinceCreated = (now - new Date(r.created_at).getTime()) / 86_400_000
    return { ...r, marginPercent, profitPerDish, daysSinceCreated }
  })

  // ── 5. Categorise candidates ──────────────────────────────────────────────
  const repriceCandidates = recipesWithMargin.filter(
    (r) => r.marginPercent < 30 && r.daysSinceCreated > 7,
  )
  const promoteCandidates = recipesWithMargin
    .filter((r) => r.marginPercent >= 50)
    .sort((a, b) => b.marginPercent - a.marginPercent)
    .slice(0, 2)
  const removeCandidates = recipesWithMargin.filter(
    (r) => r.marginPercent < 30 && r.daysSinceCreated > 30,
  )

  const hasAnyCandidates =
    repriceCandidates.length > 0 || promoteCandidates.length > 0 || removeCandidates.length > 0

  // Delete old menu insights regardless — they may be stale even if no new ones
  await deleteOldMenuInsights(supabaseUrl, serviceKey, restaurantId)

  if (!hasAnyCandidates || !apiKey) {
    return ok200({ insights: [] })
  }

  // ── 6. Build Claude prompt ────────────────────────────────────────────────
  const formatLine = (r: RecipeWithMargin) =>
    `recipe_id: ${r.id}, name: "${r.name}", selling_price: ₹${r.selling_price}, ` +
    `margin: ${r.marginPercent.toFixed(1)}%, profit_per_dish: ₹${r.profitPerDish.toFixed(0)}, ` +
    `days_on_menu: ${Math.round(r.daysSinceCreated)}`

  const repriceSection = repriceCandidates.length > 0
    ? `\nREPRICE OPPORTUNITIES (margin < 30%, on menu >7 days):\n${repriceCandidates.map(formatLine).join('\n')}`
    : ''
  const promoteSection = promoteCandidates.length > 0
    ? `\nTOP MARGIN DISHES — promote these (margin ≥ 50%):\n${promoteCandidates.map(formatLine).join('\n')}`
    : ''
  const removeSection = removeCandidates.length > 0
    ? `\nCONSIDER REMOVING (margin < 30%, on menu >30 days):\n${removeCandidates.map(formatLine).join('\n')}`
    : ''

  const userMessage =
    `Indian restaurant menu analysis:` +
    repriceSection +
    promoteSection +
    removeSection +
    `\n\nReturn ONE action per dish listed above. ` +
    `For reprice dishes, suggested_price must be a specific single ₹ number (not a range). ` +
    `Return ONLY valid JSON — no markdown, no code fences, no explanation.`

  const systemPrompt =
    'You are a menu optimisation advisor for an Indian restaurant. ' +
    'Analyse the menu and return specific actions as JSON only: ' +
    '{ "insights": [{ "type": "reprice"|"promote"|"remove", "recipe_id": string, "message": string, "suggested_price"?: number, "reason": string }] }. ' +
    'Rules: reprice only if margin < 30% for > 7 days. Promote only the top 2 margin dishes. ' +
    'Remove only if margin < 30% for > 30 days. ' +
    'Always include the dish name and specific ₹ amounts in message.'

  // ── 7. Call Claude ────────────────────────────────────────────────────────
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS)

  let claudeInsights: ClaudeInsight[] = []

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
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    })

    if (!claudeRes.ok) {
      console.error('[ai-menu-optimisation] Anthropic returned', claudeRes.status)
      return ok200({ insights: [] })
    }

    const data = await claudeRes.json()
    const raw = ((data?.content?.[0]?.text as string) ?? '').trim()
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(jsonStr)

    if (Array.isArray(parsed?.insights)) {
      claudeInsights = parsed.insights.filter(
        (ins: unknown) =>
          ins !== null &&
          typeof ins === 'object' &&
          ['reprice', 'promote', 'remove'].includes((ins as ClaudeInsight).type) &&
          typeof (ins as ClaudeInsight).recipe_id === 'string' &&
          typeof (ins as ClaudeInsight).message === 'string',
      ) as ClaudeInsight[]
    }
  } catch (err) {
    console.error('[ai-menu-optimisation] Claude call failed:', err)
    return ok200({ insights: [] })
  } finally {
    clearTimeout(timeout)
  }

  // ── 8. Post-validate: enforce type rules, deduplicate ─────────────────────
  const marginByRecipeId = new Map(recipesWithMargin.map((r) => [r.id, r.marginPercent]))
  const seenReprice = new Set<string>()
  const validatedInsights: ClaudeInsight[] = []

  for (const ins of claudeInsights) {
    const margin = marginByRecipeId.get(ins.recipe_id)
    if (margin === undefined) continue   // recipe_id not in our data — discard

    if (ins.type === 'reprice') {
      if (margin >= 30) continue                                              // rule: only reprice if margin < 30%
      if (seenReprice.has(ins.recipe_id)) continue                           // at most 1 per dish
      if (typeof ins.suggested_price !== 'number' || ins.suggested_price <= 0) continue  // must be a specific ₹ number
      seenReprice.add(ins.recipe_id)
    }
    if (ins.type === 'promote' && margin < 50) continue  // rule: only promote if margin ≥ 50%
    if (ins.type === 'remove'  && margin >= 30) continue // rule: only remove if margin < 30%

    validatedInsights.push(ins)
  }

  // ── 9. Upsert: insert validated insights ─────────────────────────────────
  const rows = validatedInsights.map((ins) => ({
    restaurant_id: restaurantId,
    insight_type:  ins.type,
    recipe_id:     ins.recipe_id,
    message:       ins.message,
    data: {
      suggested_price: ins.suggested_price ?? null,
      reason:          ins.reason ?? '',
      marginPercent:   marginByRecipeId.get(ins.recipe_id) ?? 0,
    },
  }))

  await insertInsights(supabaseUrl, serviceKey, rows)

  return ok200({ insights: rows })
})
