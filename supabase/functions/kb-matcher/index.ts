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

    // No match found — log and continue. Never blocks the insert.
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

  // Pass 2: normalised exact match (strips brackets, slashes)
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
