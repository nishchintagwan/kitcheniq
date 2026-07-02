import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Copy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { calculateMargin, ingredientCost, formatCurrency, formatMargin } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
import Button from '../components/ui/Button'
import MarginBar from '../components/ui/MarginBar'
import Skeleton from '../components/ui/Skeleton'
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
function uid() { return `new-${++_uid}` }

export default function EditRecipeScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { recipes, recipeIngredients, fetchRecipes, fetchRecipeIngredients } = useRecipeStore()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [formIngredients, setFormIngredients] = useState<FormIngredient[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const initializedRef = useRef(false)
  const recipe = recipes.find((r) => r.id === id)

  const { register, control, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serves: 1, wastage_percent: 10, overhead_percent: 20 },
  })

  useEffect(() => {
    if (!id || !restaurant?.id) return
    const restaurantId = restaurant.id
    const fetches: Promise<void>[] = []
    if (!recipeIngredients[id]) fetches.push(fetchRecipeIngredients(id))
    if (ingredients.length === 0) fetches.push(fetchIngredients(restaurantId))
    if (fetches.length === 0) { setIsLoading(false); return }
    Promise.all(fetches).then(() => setIsLoading(false))
  }, [id, restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading || !recipe || ingredients.length === 0 || initializedRef.current) return
    reset({ name: recipe.name, category: recipe.category, selling_price: recipe.selling_price,
      serves: recipe.serves, wastage_percent: recipe.wastage_percent, overhead_percent: recipe.overhead_percent })
    const items = recipeIngredients[id ?? ''] ?? []
    setFormIngredients(items.map((ri) => {
      const ing = ingredients.find((i) => i.id === ri.ingredient_id)
      if (!ing) return null
      return { _id: ri.id, ingredientId: ri.ingredient_id, name: ing.name, quantity: ri.quantity, unit: ri.unit, pricePerKg: ing.price_per_kg }
    }).filter((x): x is FormIngredient => x !== null))
    initializedRef.current = true
  }, [isLoading, recipe, ingredients, recipeIngredients, id, reset])

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
    if (!restaurantId || !id) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('recipes').update({
        name: data.name, category: data.category, selling_price: data.selling_price,
        serves: data.serves, wastage_percent: data.wastage_percent, overhead_percent: data.overhead_percent,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) return
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)
      if (formIngredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          formIngredients.map((i) => ({ recipe_id: id, ingredient_id: i.ingredientId, quantity: i.quantity, unit: i.unit }))
        )
      }
      await fetchRecipes(restaurantId)
      await fetchRecipeIngredients(id)
      navigate(`/recipes/${id}`)
    } catch { /* silent */ } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    const restaurantId = restaurant?.id
    if (!restaurantId || !id) return
    setIsDeleting(true)
    try {
      await supabase.from('recipes').delete().eq('id', id)
      await fetchRecipes(restaurantId)
      navigate('/recipes')
    } catch { /* silent */ } finally { setIsDeleting(false) }
  }

  async function handleDuplicate() {
    if (!recipe || !restaurant?.id || !id) return
    setIsDuplicating(true)
    try {
      const { data: newRecipe, error } = await supabase.from('recipes').insert({
        restaurant_id: restaurant.id, name: `Copy of ${recipe.name}`, category: recipe.category,
        selling_price: recipe.selling_price, serves: recipe.serves,
        wastage_percent: recipe.wastage_percent, overhead_percent: recipe.overhead_percent,
      }).select().single()
      if (error || !newRecipe) return
      const items = recipeIngredients[id] ?? []
      if (items.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          items.map((i) => ({ recipe_id: newRecipe.id, ingredient_id: i.ingredient_id, quantity: i.quantity, unit: i.unit }))
        )
      }
      await fetchRecipes(restaurant.id)
      await fetchRecipeIngredients(newRecipe.id)
      navigate(`/recipes/${newRecipe.id}`)
    } catch { /* silent */ } finally { setIsDuplicating(false) }
  }

  if (!recipe && !isLoading) {
    return (
      <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
        <GlacierHeader title="Edit Recipe" showBack breadcrumb="Menu" />
        <p style={{ textAlign: 'center', color: '#9AA4B8', fontSize: 13, padding: 32 }}>Recipe not found</p>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader
        title="Edit Recipe"
        showBack
        breadcrumb={recipe?.name ?? 'Dish'}
        rightElement={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={isDuplicating}
              aria-label="Duplicate"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1, opacity: isDuplicating ? 0.5 : 1 }}
            >
              <Copy size={16} strokeWidth={1.5} color="#9AA4B8" />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1 }}
            >
              <Trash2 size={16} strokeWidth={1.5} color="#F0596B" />
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[80, 120, 52, 52, 52].map((h, i) => <Skeleton key={i} height={h} radius={10} />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ padding: '16px 16px 112px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div style={{ backgroundColor: '#161D2B', border: '1px solid rgba(240,89,107,0.3)', borderRadius: 12, padding: 16 }}>
                <p style={{ fontSize: 13, color: '#F4F6FA', margin: '0 0 14px', textAlign: 'center' }}>
                  Delete this dish? This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{
                    flex: 1, backgroundColor: '#1B2436', color: '#F4F6FA', border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 10, padding: 10, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                  }}>Cancel</button>
                  <button type="button" onClick={handleDelete} disabled={isDeleting} style={{
                    flex: 1, backgroundColor: '#F0596B', color: '#FFFFFF', border: 'none',
                    borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.6 : 1,
                  }}>{isDeleting ? 'Deleting...' : 'Yes, delete'}</button>
                </div>
              </div>
            )}

            {/* Dish name */}
            <div>
              <label style={labelStyle}>Dish name</label>
              <input type="text" {...register('name')}
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
                <input type="number" inputMode="decimal" {...register('selling_price', { valueAsNumber: true })}
                  onFocus={() => setFocusedField('selling_price')} onBlur={() => setFocusedField(null)}
                  style={{ ...darkInput(focusedField === 'selling_price'), paddingLeft: 24 }} />
              </div>
              {errors.selling_price && <p style={errorStyle}>{errors.selling_price.message}</p>}
            </div>

            {/* Serves / Wastage / Overhead */}
            <div style={{ display: 'flex', gap: 10 }}>
              {(['serves', 'wastage_percent', 'overhead_percent'] as const).map((field) => {
                const labels: Record<string, string> = { serves: 'Serves', wastage_percent: 'Wastage %', overhead_percent: 'Overhead %' }
                return (
                  <div key={field} style={{ flex: 1 }}>
                    <label style={labelStyle}>{labels[field]}</label>
                    <input type="number" inputMode="decimal" {...register(field, { valueAsNumber: true })}
                      onFocus={() => setFocusedField(field)} onBlur={() => setFocusedField(null)}
                      style={darkInput(focusedField === field)} />
                    {errors[field] && <p style={errorStyle}>{errors[field]?.message}</p>}
                  </div>
                )
              })}
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
                  <p style={{ fontSize: 12, color: '#6B7588', margin: 0 }}>No ingredients — tap "Add ingredient" above</p>
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
              <div style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
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
              </div>
            )}

            <Button fullWidth disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>

          </div>
        </form>
      )}

      <IngredientBottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={addIngredient} restaurantId={restaurant?.id ?? ''} />
      <BottomNav />
    </div>
  )
}
