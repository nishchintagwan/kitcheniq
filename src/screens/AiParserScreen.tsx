import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { calculateMargin, formatCurrency, formatMargin, ingredientCost } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
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

function makeId() { return Math.random().toString(36).slice(2, 9) }

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
    if (!text.trim()) { setError('Please describe your dish'); return }
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
        name: string; category: string; estimated_selling_price: number
        ingredients: RawIngredient[]; serves: number
        wastage_percent: number; overhead_percent: number
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
      return { ...prev, ingredients: prev.ingredients.map((i) => i._id === id ? { ...i, [field]: value } : i) }
    })
  }

  function handleAddAnother() {
    setText(''); setError(''); setParsedRecipe(null); setPhase('idle')
  }

  const margin = parsedRecipe
    ? calculateMargin({
        ingredients: parsedRecipe.ingredients.map((i) => ({ quantity: i.quantity, unit: i.unit, pricePerKg: i.estimated_price_per_kg })),
        sellingPrice: parsedRecipe.selling_price,
        serves: parsedRecipe.serves,
        wastagePercent: parsedRecipe.wastage_percent,
        overheadPercent: parsedRecipe.overhead_percent,
      })
    : null

  const inlineDark: React.CSSProperties = {
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'transparent',
    fontSize: 13,
    color: '#F4F6FA',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    paddingBottom: 4,
  }

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Add your first dish" subtitle="Describe it naturally — AI will understand" />

      <div style={{ padding: '16px 16px 80px' }}>

        {/* Idle */}
        {phase === 'idle' && (
          <>
            {/* AI card */}
            <div
              style={{
                backgroundColor: 'rgba(63,198,240,0.14)',
                border: '1px solid rgba(63,198,240,0.25)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles size={20} strokeWidth={1.5} color="#3FC6F0" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#F4F6FA' }}>AI Recipe Parser</span>
              </div>
              <p style={{ fontSize: 11, color: '#9AA4B8', fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5 }}>
                e.g. "Dal Makhani — 200g urad dal, 60g cream..."
              </p>

              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); if (error) setError('') }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Describe your dish with ingredients and quantities..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 100,
                  backgroundColor: '#0C111B',
                  border: `1px solid ${focused ? '#3FC6F0' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 13,
                  color: '#F4F6FA',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                }}
              />

              {error && <p style={{ color: '#F0596B', fontSize: 11, margin: '6px 0 0' }}>{error}</p>}

              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => { setText(chip.text); setError('') }}
                    style={{
                      backgroundColor: '#1B2436',
                      color: '#9AA4B8',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 9999,
                      padding: '5px 12px',
                      fontSize: 10,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 12 }}>
                <Button fullWidth onClick={handleParse}>
                  Parse with AI →
                </Button>
              </div>
            </div>

            <Button variant="ghost" fullWidth onClick={() => navigate('/dashboard')}>
              Skip and go to dashboard →
            </Button>
          </>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={52} radius={10} />
            <Skeleton height={84} radius={10} />
            <Skeleton height={84} radius={10} />
            <Skeleton height={52} radius={10} />
          </div>
        )}

        {/* Result */}
        {phase === 'result' && parsedRecipe && (
          <>
            {/* Dish header card */}
            <div
              style={{
                backgroundColor: '#161D2B',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 9, color: '#6B7588', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                Dish name
              </p>
              <input
                value={parsedRecipe.name}
                onChange={(e) => setParsedRecipe((p) => p ? { ...p, name: e.target.value } : p)}
                style={{ ...inlineDark, fontSize: 15, fontWeight: 600, marginBottom: 12 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ backgroundColor: 'rgba(63,198,240,0.1)', color: '#3FC6F0', fontSize: 10, borderRadius: 9999, padding: '3px 10px' }}>
                  {parsedRecipe.category}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#9AA4B8', fontSize: 12 }}>₹</span>
                  <input
                    type="number"
                    value={parsedRecipe.selling_price || ''}
                    onChange={(e) => setParsedRecipe((p) => p ? { ...p, selling_price: Number(e.target.value) || 0 } : p)}
                    placeholder="0"
                    style={{ ...inlineDark, width: 70, textAlign: 'right', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>

            <p style={{ fontSize: 9, fontWeight: 800, color: '#6B7588', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Ingredients
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {parsedRecipe.ingredients.map((ing) => {
                const cost = ingredientCost(ing.quantity, ing.unit, ing.estimated_price_per_kg) / Math.max(parsedRecipe.serves, 1)
                return (
                  <div
                    key={ing._id}
                    style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}
                  >
                    <input
                      value={ing.name}
                      onChange={(e) => updateIngredient(ing._id, 'name', e.target.value)}
                      style={{ ...inlineDark, fontWeight: 600, marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        value={ing.quantity || ''}
                        onChange={(e) => updateIngredient(ing._id, 'quantity', Number(e.target.value) || 0)}
                        placeholder="qty"
                        style={{ ...inlineDark, width: 48, fontWeight: 600 }}
                      />
                      {UNITS.map((u) => (
                        <button
                          key={u}
                          onClick={() => updateIngredient(ing._id, 'unit', u)}
                          style={{
                            backgroundColor: ing.unit === u ? '#3FC6F0' : '#0C111B',
                            color: ing.unit === u ? '#04212E' : '#9AA4B8',
                            border: ing.unit === u ? 'none' : '1px solid rgba(255,255,255,0.14)',
                            borderRadius: 9999,
                            padding: '2px 7px',
                            fontSize: 10,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            fontWeight: ing.unit === u ? 700 : 400,
                          }}
                        >
                          {u}
                        </button>
                      ))}
                      <span style={{ marginLeft: 'auto', color: '#9AA4B8', fontSize: 11 }}>
                        {formatCurrency(cost)}/portion
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {margin && (
              <div
                style={{
                  backgroundColor: '#161D2B',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: '#6B7588', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                    Est. margin
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FA' }}>
                    {formatMargin(margin.marginPercent)}
                  </span>
                </div>
                <MarginBar percent={margin.marginPercent} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: '#9AA4B8' }}>Cost: {formatCurrency(margin.totalCost)}</span>
                  <span style={{ fontSize: 11, color: '#9AA4B8' }}>Profit: {formatCurrency(margin.profitPerDish)}</span>
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

        {/* Saved */}
        {phase === 'saved' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: '50%',
                backgroundColor: 'rgba(54,211,153,0.14)',
                border: '1px solid rgba(54,211,153,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Check size={22} strokeWidth={1.5} color="#36D399" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FA', margin: '0 0 4px' }}>
              Dish saved!
            </p>
            <p style={{ fontSize: 12, color: '#9AA4B8', margin: '0 0 28px' }}>
              {parsedRecipe?.name} has been added to your menu.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button fullWidth onClick={handleAddAnother}>Add another dish</Button>
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
