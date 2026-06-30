// ai-nutrition — calculates per-serving nutritional data for a recipe.
// Uses IFCT 2017 data from ingredient_nutrition table for known ingredients;
// falls back to Claude for any not found there.
// Upserts result to nutrition_data and returns the saved row.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CLAUDE_TIMEOUT_MS = 15_000

// Convert a recipe ingredient unit to grams for nutritional calculation.
// Cost calculator uses kg/litre as base; nutrition needs grams.
const UNIT_TO_GRAMS: Record<string, number> = {
  kg:    1000,
  gram:  1,
  litre: 1000,  // water-based liquids ≈ 1g/ml
  ml:    1,
  piece: 100,   // rough: 1 piece ≈ 100g
  dozen: 1200,  // 12 × 100g
}

// ── Types ────────────────────────────────────────────────────────────────────

interface RecipeRow {
  id: string
  serves: number
}

interface RIRow {
  ingredient_id: string
  quantity: number
  unit: string
  ingredient_name: string
}

interface IfctRow {
  ingredient_name: string
  energy_kcal:     number | null
  protein_g:       number | null
  carbs_g:         number | null
  fat_g:           number | null
  fibre_g:         number | null
  sodium_mg:       number | null
}

interface NutrientProfile {
  energy_kcal:     number
  protein_g:       number
  carbs_g:         number
  sugars_g:        number
  fat_g:           number
  saturated_fat_g: number
  fibre_g:         number
  sodium_mg:       number
}

const ZERO: NutrientProfile = {
  energy_kcal: 0, protein_g: 0, carbs_g: 0, sugars_g: 0,
  fat_g: 0, saturated_fat_g: 0, fibre_g: 0, sodium_mg: 0,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok200(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// ── Supabase fetch helpers ────────────────────────────────────────────────────

async function fetchRecipe(
  url: string, key: string, recipeId: string,
): Promise<RecipeRow | null> {
  try {
    const u = new URL(`${url}/rest/v1/recipes`)
    u.searchParams.set('id', `eq.${recipeId}`)
    u.searchParams.set('select', 'id,serves')
    const res = await fetch(u.toString(), {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) ? (data[0] ?? null) : null
  } catch {
    return null
  }
}

async function fetchRecipeIngredients(
  url: string, key: string, recipeId: string,
): Promise<RIRow[]> {
  try {
    const u = new URL(`${url}/rest/v1/recipe_ingredients`)
    u.searchParams.set('recipe_id', `eq.${recipeId}`)
    u.searchParams.set('select', 'ingredient_id,quantity,unit,ingredients(name)')
    const res = await fetch(u.toString(), {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return []
    const raw: { ingredient_id: string; quantity: number; unit: string; ingredients: { name: string } | null }[] =
      await res.json()
    return (raw ?? []).map((row) => ({
      ingredient_id:   row.ingredient_id,
      quantity:        row.quantity,
      unit:            row.unit,
      ingredient_name: row.ingredients?.name ?? '',
    }))
  } catch {
    return []
  }
}

async function fetchIfctAll(url: string, key: string): Promise<IfctRow[]> {
  try {
    const u = new URL(`${url}/rest/v1/ingredient_nutrition`)
    u.searchParams.set(
      'select',
      'ingredient_name,energy_kcal,protein_g,carbs_g,fat_g,fibre_g,sodium_mg',
    )
    u.searchParams.set('limit', '500')
    const res = await fetch(u.toString(), {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return []
    return (await res.json()) ?? []
  } catch {
    return []
  }
}

// ── IFCT matching ─────────────────────────────────────────────────────────────

function findIfctMatch(ingredientName: string, ifctRows: IfctRow[]): IfctRow | null {
  const name = ingredientName.toLowerCase().trim()
  // 1. Exact match
  let hit = ifctRows.find((r) => r.ingredient_name.toLowerCase() === name)
  if (hit) return hit
  // 2. IFCT name is a substring of ingredient name  (e.g. "butter" in "salted butter")
  hit = ifctRows.find((r) => name.includes(r.ingredient_name.toLowerCase()))
  if (hit) return hit
  // 3. Ingredient name is a substring of IFCT name
  hit = ifctRows.find((r) => r.ingredient_name.toLowerCase().includes(name))
  if (hit) return hit
  return null
}

function ifctToProfile(row: IfctRow): NutrientProfile {
  return {
    energy_kcal:     row.energy_kcal     ?? 0,
    protein_g:       row.protein_g       ?? 0,
    carbs_g:         row.carbs_g         ?? 0,
    sugars_g:        0,   // not in IFCT table — computed via Claude for unknowns
    fat_g:           row.fat_g           ?? 0,
    saturated_fat_g: 0,   // not in IFCT table
    fibre_g:         row.fibre_g         ?? 0,
    sodium_mg:       row.sodium_mg       ?? 0,
  }
}

// ── Claude estimation ─────────────────────────────────────────────────────────

async function estimateWithClaude(
  apiKey: string,
  names: string[],
): Promise<Map<string, NutrientProfile>> {
  const result = new Map<string, NutrientProfile>()
  if (names.length === 0) return result

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS)

  try {
    const list   = names.map((n, i) => `${i + 1}. ${n}`).join('\n')
    const prompt =
      `Estimate nutritional values per 100g for these Indian cooking ingredients:\n${list}\n\n` +
      `Return ONLY valid JSON — no markdown fences, no explanation:\n` +
      `{ "ingredients": [{ "name": "<exact name as given above>", "energy_kcal": number, ` +
      `"protein_g": number, "carbs_g": number, "sugars_g": number, "fat_g": number, ` +
      `"saturated_fat_g": number, "fibre_g": number, "sodium_mg": number }] }`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })

    if (!res.ok) return result

    const data    = await res.json()
    const raw     = ((data?.content?.[0]?.text as string) ?? '').trim()
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed  = JSON.parse(jsonStr)

    if (Array.isArray(parsed?.ingredients)) {
      for (const item of parsed.ingredients) {
        if (!item?.name) continue
        result.set(item.name.toLowerCase(), {
          energy_kcal:     Math.max(0, Number(item.energy_kcal ?? 0)),
          protein_g:       Math.max(0, Number(item.protein_g ?? 0)),
          carbs_g:         Math.max(0, Number(item.carbs_g ?? 0)),
          sugars_g:        Math.max(0, Number(item.sugars_g ?? 0)),
          fat_g:           Math.max(0, Number(item.fat_g ?? 0)),
          saturated_fat_g: Math.max(0, Number(item.saturated_fat_g ?? 0)),
          fibre_g:         Math.max(0, Number(item.fibre_g ?? 0)),
          sodium_mg:       Math.max(0, Number(item.sodium_mg ?? 0)),
        })
      }
    }
  } catch (err) {
    console.error('[ai-nutrition] Claude call failed:', err)
  } finally {
    clearTimeout(timeout)
  }

  return result
}

function resolveFromClaude(
  ri: RIRow,
  claudeMap: Map<string, NutrientProfile>,
): NutrientProfile {
  const lower = ri.ingredient_name.toLowerCase()
  // Exact match on lowercase name
  if (claudeMap.has(lower)) return claudeMap.get(lower)!
  // Contains match
  for (const [k, v] of claudeMap) {
    if (lower.includes(k) || k.includes(lower)) return v
  }
  return { ...ZERO }
}

// ── Nutrition computation ─────────────────────────────────────────────────────

function computePerServing(
  items: RIRow[],
  resolved: Map<string, NutrientProfile>,
  serves: number,
): NutrientProfile {
  const t = { ...ZERO }
  const s = Math.max(serves, 1)

  for (const ri of items) {
    const grams  = ri.quantity * (UNIT_TO_GRAMS[ri.unit] ?? 1)
    const factor = grams / 100
    const p      = resolved.get(ri.ingredient_id) ?? ZERO

    t.energy_kcal     += factor * p.energy_kcal
    t.protein_g       += factor * p.protein_g
    t.carbs_g         += factor * p.carbs_g
    t.sugars_g        += factor * p.sugars_g
    t.fat_g           += factor * p.fat_g
    t.saturated_fat_g += factor * p.saturated_fat_g
    t.fibre_g         += factor * p.fibre_g
    t.sodium_mg       += factor * p.sodium_mg
  }

  return {
    energy_kcal:     Math.max(0, t.energy_kcal     / s),
    protein_g:       Math.max(0, t.protein_g       / s),
    carbs_g:         Math.max(0, t.carbs_g         / s),
    sugars_g:        Math.max(0, t.sugars_g        / s),
    fat_g:           Math.max(0, t.fat_g           / s),
    saturated_fat_g: Math.max(0, t.saturated_fat_g / s),
    fibre_g:         Math.max(0, t.fibre_g         / s),
    sodium_mg:       Math.max(0, t.sodium_mg       / s),
  }
}

// ── Upsert ────────────────────────────────────────────────────────────────────

async function upsertNutritionData(
  supabaseUrl: string,
  serviceKey:  string,
  data:        Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const url = new URL(`${supabaseUrl}/rest/v1/nutrition_data`)
    url.searchParams.set('on_conflict', 'recipe_id')

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        apikey:         serviceKey,
        Authorization:  `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer:         'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      console.error('[ai-nutrition] upsert failed', res.status, await res.text())
      return null
    }

    const result = await res.json()
    return Array.isArray(result) ? (result[0] ?? null) : result
  } catch (err) {
    console.error('[ai-nutrition] upsert error:', err)
    return null
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey      = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    return ok200({ error: 'configuration_missing' })
  }

  // ── 1. Parse request ──────────────────────────────────────────────────────
  let recipeId: string
  try {
    const body = await req.json()
    recipeId   = String(body.recipeId ?? '').trim()
    if (!recipeId) return ok200({ error: 'recipe_id_required' })
  } catch {
    return ok200({ error: 'invalid_request' })
  }

  // ── 2. Fetch recipe ───────────────────────────────────────────────────────
  const recipe = await fetchRecipe(supabaseUrl, serviceKey, recipeId)
  if (!recipe) return ok200({ error: 'recipe_not_found' })

  // ── 3. Fetch recipe ingredients with ingredient names ─────────────────────
  const recipeIngredients = await fetchRecipeIngredients(supabaseUrl, serviceKey, recipeId)

  // ── 4. Validate: need at least 3 ingredients ──────────────────────────────
  if (recipeIngredients.length < 3) {
    return ok200({ error: 'too_few_ingredients' })
  }

  // ── 5. Fetch IFCT reference data (globally readable — no RLS) ─────────────
  const ifctRows = await fetchIfctAll(supabaseUrl, serviceKey)

  // ── 6. Match each ingredient to IFCT; collect unknowns ───────────────────
  const resolved = new Map<string, NutrientProfile>()
  const unknowns: RIRow[] = []

  for (const ri of recipeIngredients) {
    const match = findIfctMatch(ri.ingredient_name, ifctRows)
    if (match) {
      resolved.set(ri.ingredient_id, ifctToProfile(match))
    } else {
      unknowns.push(ri)
    }
  }

  // ── 7. Call Claude for unknowns ───────────────────────────────────────────
  let isAiEstimate = false

  if (unknowns.length > 0) {
    isAiEstimate = true

    if (apiKey) {
      const claudeMap = await estimateWithClaude(apiKey, unknowns.map((u) => u.ingredient_name))
      for (const ri of unknowns) {
        resolved.set(ri.ingredient_id, resolveFromClaude(ri, claudeMap))
      }
    } else {
      // No API key — default to zero for unknowns (safe fallback)
      for (const ri of unknowns) {
        resolved.set(ri.ingredient_id, { ...ZERO })
      }
    }
  }

  // ── 8. Compute per-serving totals ─────────────────────────────────────────
  const totals = computePerServing(recipeIngredients, resolved, recipe.serves)

  // ── 9. Upsert to nutrition_data ───────────────────────────────────────────
  const row = {
    recipe_id:        recipeId,
    energy_kcal:      totals.energy_kcal,
    protein_g:        totals.protein_g,
    carbs_g:          totals.carbs_g,
    sugars_g:         totals.sugars_g,
    fat_g:            totals.fat_g,
    saturated_fat_g:  totals.saturated_fat_g,
    fibre_g:          totals.fibre_g,
    sodium_mg:        totals.sodium_mg,
    is_ai_estimate:   isAiEstimate,
    calculated_at:    new Date().toISOString(),
  }

  const saved = await upsertNutritionData(supabaseUrl, serviceKey, row)
  return ok200(saved ?? row)
})
