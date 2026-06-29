// AI recipe parser — parses a plain-English dish description into structured recipe JSON.
// Library prices override Claude's estimates when ingredient names match.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_UNITS = ['kg', 'gram', 'litre', 'ml', 'piece', 'dozen'] as const
type ValidUnit = typeof VALID_UNITS[number]

interface LibraryIngredient {
  name: string
  price_per_kg: number
  unit: string
}

interface RawIngredient {
  name?: unknown
  quantity?: unknown
  unit?: unknown
  estimated_price_per_kg?: unknown
}

interface RawRecipe {
  name?: unknown
  category?: unknown
  estimated_selling_price?: unknown
  ingredients?: RawIngredient[]
  serves?: unknown
  wastage_percent?: unknown
  overhead_percent?: unknown
}

interface ParsedIngredient {
  name: string
  quantity: number
  unit: ValidUnit
  estimated_price_per_kg: number
}

interface ParsedRecipe {
  name: string
  category: string
  estimated_selling_price: number
  ingredients: ParsedIngredient[]
  serves: number
  wastage_percent: number
  overhead_percent: number
}

function ok200(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function fetchLibrary(supabaseUrl: string, serviceKey: string): Promise<LibraryIngredient[]> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ingredient_library?select=name,price_per_kg,unit`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    )
    if (!res.ok) return []
    return (await res.json()) as LibraryIngredient[]
  } catch {
    return []
  }
}

function libraryPrice(ingName: string, library: LibraryIngredient[]): number | null {
  const lower = ingName.toLowerCase().trim()
  const match = library.find((lib) => {
    const libLower = lib.name.toLowerCase()
    return libLower === lower || lower.includes(libLower) || libLower.includes(lower)
  })
  return match ? match.price_per_kg : null
}

function normalizeUnit(raw: unknown): ValidUnit {
  const s = String(raw ?? '').toLowerCase().trim()
  if ((VALID_UNITS as readonly string[]).includes(s)) return s as ValidUnit
  if (s === 'grams' || s === 'g') return 'gram'
  if (s === 'milliliter' || s === 'milliliters') return 'ml'
  if (s === 'liter' || s === 'liters' || s === 'l') return 'litre'
  if (s === 'pieces' || s === 'pcs' || s === 'nos') return 'piece'
  if (s === 'dozens') return 'dozen'
  if (s === 'kgs' || s === 'kilogram' || s === 'kilograms') return 'kg'
  return 'gram'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey      = Deno.env.get('ANTHROPIC_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!apiKey) return ok200({ error: 'parse_failed' })

  let text: string
  let city: string
  try {
    const body = await req.json()
    text = String(body.text ?? '').trim()
    city = String(body.city ?? '').trim() || 'Delhi'
    if (!text) return ok200({ error: 'parse_failed' })
  } catch {
    return ok200({ error: 'parse_failed' })
  }

  // Fetch library for price enrichment and prompt context
  const library: LibraryIngredient[] = supabaseUrl && serviceKey
    ? await fetchLibrary(supabaseUrl, serviceKey)
    : []

  const libraryContext = library.length > 0
    ? '\n\nKnown ingredient prices for this region (use these exact values when the dish contains matching ingredients):\n' +
      library.map((l) => `- ${l.name}: Rs.${l.price_per_kg}/kg`).join('\n')
    : ''

  const systemPrompt =
    `You are a recipe cost analyst for Indian restaurants. Parse the dish description and return ONLY valid JSON. ` +
    `Format: { name: string, category: string, estimated_selling_price: number, ` +
    `ingredients: [{ name: string, quantity: number, unit: 'kg'|'gram'|'litre'|'ml'|'piece'|'dozen', estimated_price_per_kg: number }], ` +
    `serves: number, wastage_percent: number, overhead_percent: number }. ` +
    `Base prices on typical ${city} mandi prices. wastage_percent default 10, overhead_percent default 20.` +
    libraryContext

  let claudeRes: Response
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{ role: 'user', content: text }],
      }),
    })
  } catch (err) {
    console.error('[ai-recipe-parser] Anthropic network error:', err)
    return ok200({ error: 'parse_failed' })
  }

  if (!claudeRes.ok) {
    console.error('[ai-recipe-parser] Anthropic returned', claudeRes.status)
    return ok200({ error: 'parse_failed' })
  }

  let rawText = ''
  try {
    const claudeData = await claudeRes.json()
    rawText = (claudeData?.content?.[0]?.text as string) ?? ''
  } catch (err) {
    console.error('[ai-recipe-parser] Failed to read Anthropic body:', err)
    return ok200({ error: 'parse_failed' })
  }

  // Parse JSON — strip markdown fences if present
  let recipe: ParsedRecipe
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    const raw = JSON.parse(match ? match[0] : rawText) as RawRecipe

    const ingredients: ParsedIngredient[] = (raw.ingredients ?? [])
      .map((ing) => {
        const name = String(ing.name ?? '').trim()
        const unit = normalizeUnit(ing.unit)
        const claudePrice = Number(ing.estimated_price_per_kg) || 0
        // Library price takes precedence over Claude's estimate
        const price = libraryPrice(name, library) ?? claudePrice
        return {
          name,
          quantity: Number(ing.quantity) || 0,
          unit,
          estimated_price_per_kg: price,
        }
      })
      .filter((i) => i.name.length > 0)

    recipe = {
      name: String(raw.name ?? '').trim(),
      category: String(raw.category ?? 'Main Course').trim(),
      estimated_selling_price: Number(raw.estimated_selling_price) || 0,
      ingredients,
      serves: Math.max(1, Number(raw.serves) || 1),
      wastage_percent: Number(raw.wastage_percent) || 10,
      overhead_percent: Number(raw.overhead_percent) || 20,
    }
  } catch {
    // Partial fallback — return safe defaults so HTTP 200 never crashes the client
    recipe = {
      name: '',
      category: 'Main Course',
      estimated_selling_price: 0,
      ingredients: [],
      serves: 1,
      wastage_percent: 10,
      overhead_percent: 20,
    }
  }

  return ok200(recipe)
})
