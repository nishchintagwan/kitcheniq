// Anthropic vision Edge Function — extracts dishes from a restaurant menu photo/PDF

interface ImportedDish {
  name: string
  category: string
  selling_price: number
  confidence: number
  needs_review: boolean
}

interface RawDish {
  name?: unknown
  category?: unknown
  selling_price?: unknown
  confidence?: unknown
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT =
  'You are a menu reader for Indian restaurants. Extract every dish from the menu image. Return ONLY valid JSON with no other text. Format: { dishes: [{ name: string, category: string, selling_price: number, confidence: number }] }. Categories should be one of: Starters, Main Course, Breads, Rice, Dal, Paneer, Chicken, Mutton, Seafood, Desserts, Beverages, Soups. If price is not visible, set selling_price to 0. Set confidence 0-1 based on how clearly you could read the dish name and price.'

function toImportedDish(raw: RawDish): ImportedDish {
  const confidence =
    typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5
  const selling_price = typeof raw.selling_price === 'number' ? raw.selling_price : 0
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    category: typeof raw.category === 'string' ? raw.category : 'Main Course',
    selling_price,
    confidence,
    needs_review: confidence < 0.7 || selling_price === 0,
  }
}

function partialExtract(text: string): ImportedDish[] {
  const dishes: ImportedDish[] = []
  for (const [, name] of text.matchAll(/"name"\s*:\s*"([^"]+)"/g)) {
    dishes.push({
      name,
      category: 'Main Course',
      selling_price: 0,
      confidence: 0.5,
      needs_review: true,
    })
  }
  return dishes
}

function json503(): Response {
  return new Response(JSON.stringify({ error: 'import_failed', fallback: true }), {
    status: 503,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json503()

  let imageBase64: string
  let mediaType: string
  try {
    const body = await req.json()
    imageBase64 = body.imageBase64
    mediaType = body.mediaType
    if (!imageBase64 || !mediaType) return json503()
  } catch {
    return json503()
  }

  const source =
    mediaType === 'application/pdf'
      ? { type: 'base64', media_type: 'application/pdf', data: imageBase64 }
      : { type: 'base64', media_type: mediaType, data: imageBase64 }

  const contentBlock =
    mediaType === 'application/pdf'
      ? { type: 'document', source }
      : { type: 'image', source }

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
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              { type: 'text', text: 'Extract all dishes from this menu image.' },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    console.error('Anthropic network error:', err)
    return json503()
  }

  if (!claudeRes.ok) {
    console.error('Anthropic API returned', claudeRes.status)
    return json503()
  }

  let rawText = ''
  try {
    const claudeData = await claudeRes.json()
    rawText = claudeData?.content?.[0]?.text ?? ''
  } catch (err) {
    console.error('Failed to parse Anthropic response body:', err)
    return json503()
  }

  let dishes: ImportedDish[]
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : rawText) as { dishes?: RawDish[] }
    const raw: RawDish[] = Array.isArray(parsed.dishes) ? parsed.dishes : []
    dishes = raw.map(toImportedDish).filter((d) => d.name.trim())
  } catch {
    // JSON parse failed — extract partial data, all with confidence 0.5
    dishes = partialExtract(rawText)
  }

  return new Response(JSON.stringify({ dishes }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
