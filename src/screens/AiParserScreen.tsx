import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { calculateMargin, formatCurrency, formatMargin, ingredientCost } from '../lib/costCalculator'
import DarkHeader from '../components/ui/DarkHeader'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import MarginBar from '../components/ui/MarginBar'
import type { Unit } from '../types'

type Phase = 'idle' | 'loading' | 'result' | 'saved'

const UNITS: Unit[] = ['kg', 'gram', 'litre', 'ml', 'piece', 'dozen']

interface EditableIngredient {
  _id: string
  name: string
  quantity: number
  unit: Unit
  estimated_price_per_kg: number
}

interface EditableRecipe {
  name: string
  category: string
  selling_price: number
  ingredients: EditableIngredient[]
  serves: number
  wastage_percent: number
  overhead_percent: number
}

interface RawIngredient {
  name?: string
  quantity?: number
  unit?: string
  estimated_price_per_kg?: number
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

const CHIPS = [
  {
    label: 'Dal Makhani',
    text: 'Dal Makhani — urad dal 100g, kidney beans 50g, butter 30g, cream 50ml, tomatoes 100g, spices. Serves 1 portion.',
  },
  {
    label: 'Butter Chicken',
    text: 'Butter Chicken — chicken 200g, butter 40g, cream 60ml, tomatoes 150g, onions 80g, spices. Serves 1 portion.',
  },
  {
    label: 'Paneer Tikka',
    text: 'Paneer Tikka — paneer 200g, yogurt 50g, bell peppers 80g, onions 60g, marinade spices. Serves 2.',
  },
]

const inlineInputStyle = {
  border: 'none',
  borderBottom: '0.5px solid #EDE8F5',
  backgroundColor: 'transparent',
  fontSize: 13,
  color: '#1A1A1A',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box' as const,
  paddingBottom: 4,
}

export default function AiParserScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()

  const [phase, setPhase] = useState<Phase>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const [parsedRecipe, setParsedRecipe] = useState<EditableRecipe | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleParse() {
    if (!text.trim()) {
      setError('Please describe your dish')
      return
    }
    setError('')
    setPhase('loading')

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-recipe-parser', {
        body: {
          text: text.trim(),
          cuisineType: restaurant?.cuisine_type ?? '',
          city: restaurant?.city ?? '',
          restaurantId: restaurant?.id ?? '',
        },
      })

      if (fnError || !data?.name) {
        setError('Something went wrong — try again')
        setPhase('idle')
        return
      }

      const raw = data as {
        name: string
        category: string
        estimated_selling_price: number
        ingredients: RawIngredient[]
        serves: number
        wastage_percent: number
        overhead_percent: number
      }

      setParsedRecipe({
        name: raw.name ?? '',
        category: raw.category ?? 'Main Course',
        selling_price: raw.estimated_selling_price ?? 0,
        ingredients: (raw.ingredients ?? []).map((ing) => ({
          _id: makeId(),
          name: ing.name ?? '',
          quantity: ing.quantity ?? 0,
          unit: (UNITS.includes(ing.unit as Unit) ? ing.unit : 'gram') as Unit,
          estimated_price_per_kg: ing.estimated_price_per_kg ?? 0,
        })),
        serves: raw.serves ?? 1,
        wastage_percent: raw.wastage_percent ?? 10,
        overhead_percent: raw.overhead_percent ?? 20,
      })
      setPhase('result')
    } catch {
      setError('Something went wrong — try again')
      setPhase('idle')
    }
  }

  async function handleSave() {
    if (!parsedRecipe || !restaurant?.id) return
    setIsSaving(true)
    try {
      const { data: recipeRow, error: recipeErr } = await supabase
        .from('recipes')
        .insert({
          restaurant_id: restaurant.id,
          name: parsedRecipe.name.trim() || 'Untitled Dish',
          category: parsedRecipe.category,
          selling_price: parsedRecipe.selling_price,
          wastage_percent: parsedRecipe.wastage_percent,
          overhead_percent: parsedRecipe.overhead_percent,
          serves: parsedRecipe.serves,
        })
        .select()
        .single()

      if (recipeErr || !recipeRow) return

      for (const ing of parsedRecipe.ingredients) {
        if (!ing.name.trim()) continue
        const { data: ingRow, error: ingErr } = await supabase
          .from('ingredients')
          .insert({
            restaurant_id: restaurant.id,
            name: ing.name.trim(),
            price_per_kg: ing.estimated_price_per_kg,
            unit: ing.unit,
            last_updated: new Date().toISOString(),
          })
          .select()
          .single()

        if (ingErr || !ingRow) continue
        await supabase.from('recipe_ingredients').insert({
          recipe_id: recipeRow.id,
          ingredient_id: ingRow.id,
          quantity: ing.quantity,
          unit: ing.unit,
        })
      }

      setPhase('saved')
    } finally {
      setIsSaving(false)
    }
  }

  function updateIngredient(id: string, field: keyof EditableIngredient, value: string | number | Unit) {
    setParsedRecipe((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        ingredients: prev.ingredients.map((i) =>
          i._id === id ? { ...i, [field]: value } : i
        ),
      }
    })
  }

  function handleAddAnother() {
    setText('')
    setError('')
    setParsedRecipe(null)
    setPhase('idle')
  }

  const margin = parsedRecipe
    ? calculateMargin({
        ingredients: parsedRecipe.ingredients.map((i) => ({
          quantity: i.quantity,
          unit: i.unit,
          pricePerKg: i.estimated_price_per_kg,
        })),
        sellingPrice: parsedRecipe.selling_price,
        serves: parsedRecipe.serves,
        wastagePercent: parsedRecipe.wastage_percent,
        overheadPercent: parsedRecipe.overhead_percent,
      })
    : null

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <DarkHeader
        title="Add your first dish"
        subtitle="Type it naturally — AI will understand"
      />

      <div style={{ padding: '24px 16px 80px' }}>

        {/* ── Idle: textarea + chips ── */}
        {phase === 'idle' && (
          <>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); if (error) setError('') }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="e.g. Dal Makhani — urad dal, kidney beans, butter, cream, tomatoes, spices. Serves 1 portion."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: 120,
                backgroundColor: '#FFFAF5',
                border: `0.5px solid ${focused ? '#7C3AED' : '#EDE8F5'}`,
                borderRadius: 14,
                padding: 12,
                fontSize: 13,
                color: '#1A1A1A',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />

            {error && (
              <p style={{ color: '#FF505F', fontSize: 11, marginTop: 6, marginBottom: 0 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => { setText(chip.text); setError('') }}
                  style={{
                    backgroundColor: '#F5F0FA',
                    color: '#7C3AED',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <Button fullWidth onClick={handleParse}>
                Parse with AI →
              </Button>
            </div>

            <div style={{ marginTop: 12 }}>
              <Button variant="ghost" fullWidth onClick={() => navigate('/dashboard')}>
                Skip and go to dashboard →
              </Button>
            </div>
          </>
        )}

        {/* ── Loading: skeletons ── */}
        {phase === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={52} radius={10} />
            <Skeleton height={84} radius={10} />
            <Skeleton height={84} radius={10} />
            <Skeleton height={52} radius={10} />
          </div>
        )}

        {/* ── Result: editable recipe card ── */}
        {phase === 'result' && parsedRecipe && (
          <>
            {/* Dish header card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '0.5px solid #EDE8F5',
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 10, color: '#888888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dish name
              </p>
              <input
                value={parsedRecipe.name}
                onChange={(e) => setParsedRecipe((p) => p ? { ...p, name: e.target.value } : p)}
                style={{ ...inlineInputStyle, fontSize: 15, fontWeight: 600, marginBottom: 12 }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    backgroundColor: '#F5F0FA',
                    color: '#7C3AED',
                    fontSize: 10,
                    borderRadius: 9999,
                    padding: '3px 10px',
                  }}
                >
                  {parsedRecipe.category}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#888888', fontSize: 12 }}>₹</span>
                  <input
                    type="number"
                    value={parsedRecipe.selling_price || ''}
                    onChange={(e) =>
                      setParsedRecipe((p) => p ? { ...p, selling_price: Number(e.target.value) || 0 } : p)
                    }
                    placeholder="0"
                    style={{ ...inlineInputStyle, width: 70, textAlign: 'right', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>

            {/* Ingredients section */}
            <p style={{ fontSize: 10, fontWeight: 600, color: '#888888', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ingredients
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {parsedRecipe.ingredients.map((ing) => {
                const cost = ingredientCost(ing.quantity, ing.unit, ing.estimated_price_per_kg) / Math.max(parsedRecipe.serves, 1)
                return (
                  <div
                    key={ing._id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '0.5px solid #EDE8F5',
                      borderRadius: 10,
                      padding: '10px 12px',
                    }}
                  >
                    <input
                      value={ing.name}
                      onChange={(e) => updateIngredient(ing._id, 'name', e.target.value)}
                      style={{ ...inlineInputStyle, fontWeight: 600, marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        value={ing.quantity || ''}
                        onChange={(e) => updateIngredient(ing._id, 'quantity', Number(e.target.value) || 0)}
                        placeholder="qty"
                        style={{ ...inlineInputStyle, width: 48, fontWeight: 600 }}
                      />
                      {UNITS.map((u) => (
                        <button
                          key={u}
                          onClick={() => updateIngredient(ing._id, 'unit', u)}
                          style={{
                            backgroundColor: ing.unit === u ? '#7C3AED' : '#F5F0FA',
                            color: ing.unit === u ? '#FFFFFF' : '#7C3AED',
                            border: 'none',
                            borderRadius: 9999,
                            padding: '2px 7px',
                            fontSize: 10,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          {u}
                        </button>
                      ))}
                      <span style={{ marginLeft: 'auto', color: '#888888', fontSize: 11 }}>
                        {formatCurrency(cost)}/portion
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Estimated margin */}
            {margin && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '0.5px solid #EDE8F5',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Est. margin
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                    {formatMargin(margin.marginPercent)}
                  </span>
                </div>
                <MarginBar percent={margin.marginPercent} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: '#888888' }}>Cost: {formatCurrency(margin.totalCost)}</span>
                  <span style={{ fontSize: 11, color: '#888888' }}>Profit: {formatCurrency(margin.profitPerDish)}</span>
                </div>
              </div>
            )}

            <Button fullWidth disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Save dish'}
            </Button>

            <div style={{ marginTop: 12 }}>
              <Button variant="ghost" fullWidth onClick={() => navigate('/dashboard')}>
                Skip and go to dashboard →
              </Button>
            </div>
          </>
        )}

        {/* ── Saved: confirmation ── */}
        {phase === 'saved' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: '#F0FBF5',
                border: '0.5px solid rgba(0,220,130,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Check size={22} strokeWidth={1.5} color="#00DC82" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px' }}>
              Dish saved!
            </p>
            <p style={{ fontSize: 12, color: '#888888', margin: '0 0 28px' }}>
              {parsedRecipe?.name} has been added to your menu.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button fullWidth onClick={handleAddAnother}>
                Add another dish
              </Button>
              <Button variant="ghost" fullWidth onClick={() => navigate('/dashboard')}>
                Go to dashboard →
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
