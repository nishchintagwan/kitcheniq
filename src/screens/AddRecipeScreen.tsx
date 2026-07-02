import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { calculateMargin, ingredientCost, formatCurrency, formatMargin } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
import Button from '../components/ui/Button'
import MarginBar from '../components/ui/MarginBar'
import BottomNav from '../components/ui/BottomNav'
import IngredientBottomSheet from '../components/ui/IngredientBottomSheet'
import type { Unit, MarginResult } from '../types'

const CATEGORIES = [
  'Starters', 'Main Course', 'Breads', 'Rice', 'Dal',
  'Paneer', 'Chicken', 'Mutton', 'Seafood', 'Desserts', 'Beverages', 'Soups',
] as const

const schema = z.object({
  name: z.string().min(1, 'Enter a dish name'),
  category: z.string().min(1, 'Select a category'),
  selling_price: z.number({ message: 'Enter a selling price' }).min(0, 'Must be 0 or more'),
  serves: z.number({ message: 'Enter serves count' }).int('Must be a whole number').min(1, 'Must be at least 1'),
  wastage_percent: z.number({ message: 'Enter wastage %' }).min(0, 'Min 0%').max(50, 'Max 50%'),
  overhead_percent: z.number({ message: 'Enter overhead %' }).min(0, 'Min 0%').max(100, 'Max 100%'),
})

type FormData = z.infer<typeof schema>

interface FormIngredient {
  _id: string; ingredientId: string; name: string
  quantity: number; unit: Unit; pricePerKg: number
}

const STATUS_COLOR: Record<string, string> = { healthy: '#36D399', watch: '#F0A93F', critical: '#F0596B' }

const darkInput = (focused: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  backgroundColor: '#1B2436',
  border: `1px solid ${focused ? '#3FC6F0' : 'rgba(255,255,255,0.14)'}`,
  borderRadius: 10, padding: '12px 14px',
  fontSize: 13, color: '#F4F6FA', fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.15s',
})

const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, color: '#6B7588', textTransform: 'uppercase',
  letterSpacing: '0.06em', display: 'block', marginBottom: 6,
}

const errorStyle: React.CSSProperties = { fontSize: 11, color: '#F0596B', marginTop: 4 }

let _uid = 0
function uid() { return String(++_uid) }

export default function AddRecipeScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { fetchRecipes, fetchRecipeIngredients } = useRecipeStore()

  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category: '', selling_price: undefined, serves: 1, wastage_percent: 10, overhead_percent: 20 },
  })

  const selectedCategory = useWatch({ control, name: 'category' })
  const [sellingPrice, serves, wastagePercent, overheadPercent] = useWatch({
    control, name: ['selling_price', 'serves', 'wastage_percent', 'overhead_percent'],
  })

  const liveMargin = useMemo<MarginResult | null>(() => {
    if (formIngredients.length === 0) return null
    const price = Number(sellingPrice) || 0
    if (price <= 0) return null
    return calculateMargin({
      ingredients: formIngredients.map((i) => ({ quantity: i.quantity, unit: i.unit, pricePerKg: i.pricePerKg })),
      sellingPrice: price, serves: Math.max(Number(serves) || 1, 1),
      wastagePercent: Number(wastagePercent) ?? 10, overheadPercent: Number(overheadPercent) ?? 20,
    })
  }, [formIngredients, sellingPrice, serves, wastagePercent, overheadPercent])

  function addIngredient(ingredientId: string, name: string, quantity: number, unit: Unit, pricePerKg: number) {
    setFormIngredients((prev) => [...prev, { _id: uid(), ingredientId, name, quantity, unit, pricePerKg }])
  }
  function removeIngredient(localId: string) { setFormIngredients((prev) => prev.filter((i) => i._id !== localId)) }

  async function onSubmit(data: FormData) {
    const restaurantId = restaurant?.id
    if (!restaurantId) return
    setIsSaving(true)
    try {
      const { data: recipeRow, error } = await supabase.from('recipes')
        .insert({ restaurant_id: restaurantId, name: data.name, category: data.category,
          selling_price: data.selling_price, serves: data.serves,
          wastage_percent: data.wastage_percent, overhead_percent: data.overhead_percent })
        .select().single()
      if (error || !recipeRow) return
      if (formIngredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          formIngredients.map((i) => ({ recipe_id: recipeRow.id, ingredient_id: i.ingredientId, quantity: i.quantity, unit: i.unit }))
        )
      }
      await fetchRecipes(restaurantId)
      await fetchRecipeIngredients(recipeRow.id)
      navigate(`/recipes/${recipeRow.id}`)
    } catch { /* silent */ } finally { setIsSaving(false) }
  }

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Add Recipe" showBack breadcrumb="Menu" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div style={{ padding: '16px 16px 112px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* AI parser card */}
          <div
            style={{
              backgroundColor: 'rgba(63,198,240,0.14)', border: '1px solid rgba(63,198,240,0.3)',
              borderRadius: 16, padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={20} strokeWidth={1.5} color="#3FC6F0" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F4F6FA' }}>AI Recipe Parser</span>
            </div>
            <p style={{ fontSize: 11, color: '#9AA4B8', fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5 }}>
              "Dal Makhani — 200g urad dal, 60g cream..."
            </p>
            <Button fullWidth onClick={() => navigate('/onboarding/parse')}>
              Parse with AI →
            </Button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 9, color: '#6B7588', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>or fill manually</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Dish name */}
          <div>
            <label style={labelStyle}>Dish name</label>
            <input type="text" placeholder="e.g. Dal Makhani" {...register('name')}
              onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
              style={darkInput(focusedField === 'name')} />
            {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
          </div>

          {/* Category chips */}
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat
                return (
                  <button key={cat} type="button" onClick={() => setValue('category', cat, { shouldValidate: true })} style={{
                    backgroundColor: isActive ? '#3FC6F0' : '#1B2436', color: isActive ? '#04212E' : '#9AA4B8',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 9999, padding: '6px 12px', fontSize: 12,
                    fontWeight: isActive ? 700 : 400, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    {cat}
                  </button>
                )
              })}
            </div>
            {errors.category && <p style={errorStyle}>{errors.category.message}</p>}
          </div>

          {/* Selling price */}
          <div>
            <label style={labelStyle}>Selling price</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#6B7588', pointerEvents: 'none' }}>₹</span>
              <input type="number" inputMode="decimal" placeholder="0" {...register('selling_price', { valueAsNumber: true })}
                onFocus={() => setFocusedField('selling_price')} onBlur={() => setFocusedField(null)}
                style={{ ...darkInput(focusedField === 'selling_price'), paddingLeft: 24 }} />
            </div>
            {errors.selling_price && <p style={errorStyle}>{errors.selling_price.message}</p>}
          </div>

          {/* Serves / Wastage / Overhead */}
          <div style={{ display: 'flex', gap: 10 }}>
            {([['serves', 'Serves', 'numeric'], ['wastage_percent', 'Wastage %', 'decimal'], ['overhead_percent', 'Overhead %', 'decimal']] as const).map(([field, label]) => (
              <div key={field} style={{ flex: 1 }}>
                <label style={labelStyle}>{label}</label>
                <input type="number" inputMode="decimal" {...register(field, { valueAsNumber: true })}
                  onFocus={() => setFocusedField(field)} onBlur={() => setFocusedField(null)}
                  style={darkInput(focusedField === field)} />
                {errors[field] && <p style={errorStyle}>{errors[field]?.message}</p>}
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Ingredients</label>
              <button type="button" onClick={() => setSheetOpen(true)} style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                color: '#3FC6F0', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', padding: 0, fontWeight: 600,
              }}>
                <Plus size={14} strokeWidth={1.5} /> Add ingredient
              </button>
            </div>

            {formIngredients.length === 0 ? (
              <div style={{ backgroundColor: '#1B2436', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#6B7588', margin: 0 }}>No ingredients yet — tap "Add ingredient" above</p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#1B2436', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                {formIngredients.map((item, idx) => {
                  const costPerServe = ingredientCost(item.quantity, item.unit, item.pricePerKg) / Math.max(Number(serves) || 1, 1)
                  const isLast = idx === formIngredients.length - 1
                  return (
                    <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#F4F6FA', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                        <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0 }}>{item.quantity} {item.unit} · {formatCurrency(costPerServe)}/serve</p>
                      </div>
                      <button type="button" onClick={() => removeIngredient(item._id)} aria-label={`Remove ${item.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0 }}>
                        <Trash2 size={14} strokeWidth={1.5} color="#6B7588" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Live margin preview */}
          {liveMargin && (
            <div style={{
              backgroundColor: '#161D2B', border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 9, color: '#9AA4B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px', fontWeight: 800 }}>Margin</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: STATUS_COLOR[liveMargin.status], margin: 0, letterSpacing: '-0.5px' }}>{formatMargin(liveMargin.marginPercent)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, color: '#9AA4B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px', fontWeight: 800 }}>Profit / plate</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: STATUS_COLOR[liveMargin.status], margin: 0 }}>{formatCurrency(liveMargin.profitPerDish)}</p>
                </div>
              </div>
              <MarginBar percent={liveMargin.marginPercent} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#9AA4B8' }}>Cost: {formatCurrency(liveMargin.totalCost)}</span>
                <span style={{ fontSize: 11, color: '#9AA4B8' }}>Sells for: {formatCurrency(Number(sellingPrice) || 0)}</span>
              </div>
            </div>
          )}

          <Button fullWidth disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Recipe'}
          </Button>

        </div>
      </form>

      <IngredientBottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={addIngredient} restaurantId={restaurant?.id ?? ''} />
      <BottomNav />
    </div>
  )
}
