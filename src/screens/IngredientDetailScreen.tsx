import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Edit2, Check, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { getPriceHistory } from '../lib/queries'
import { formatCurrency } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
import Card from '../components/ui/Card'
import MarginBar from '../components/ui/MarginBar'
import StatusBadge from '../components/ui/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import type { IngredientPriceHistory, MarginResult, Recipe, Unit } from '../types'

function displayUnit(unit: Unit): string {
  if (unit === 'gram') return 'kg'
  if (unit === 'ml') return 'litre'
  return unit
}

function shortRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1w ago'
  return `${weeks}w ago`
}

function relativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

interface AffectedDish {
  recipe: Recipe
  margin: MarginResult
}

export default function IngredientDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { recipes, recipeIngredients, fetchRecipeIngredients } = useRecipeStore()
  const { ingredients, fetchIngredients, updateIngredientPrice, spikes } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [history, setHistory] = useState<IngredientPriceHistory[]>([])
  const [affectedIds, setAffectedIds] = useState<string[]>([])

  const [isEditing, setIsEditing] = useState(false)
  const [editPrice, setEditPrice] = useState('')
  const [editFocused, setEditFocused] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const ingredient = ingredients.find((i) => i.id === id)
  const spike = spikes.find((s) => s.ingredient.id === id)

  useEffect(() => {
    if (!id || !restaurant?.id) return
    const restaurantId = restaurant.id

    async function load() {
      const fetchList: Promise<void>[] = []
      if (ingredients.length === 0) fetchList.push(fetchIngredients(restaurantId))
      await Promise.all(fetchList)

      // Price history
      const hist = await getPriceHistory(id as string, 10)
      setHistory(hist)

      // Find recipes that use this ingredient
      const { data: usages } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id')
        .eq('ingredient_id', id)

      if (usages && usages.length > 0) {
        const ids = [...new Set(usages.map((u: { recipe_id: string }) => u.recipe_id))]
        setAffectedIds(ids)
        await Promise.all(ids.map((rid) => fetchRecipeIngredients(rid)))
      }

      setIsLoading(false)
    }

    load()
  }, [id, restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!id) return
    const newPrice = parseFloat(editPrice)
    if (isNaN(newPrice) || newPrice < 0) return
    setIsSaving(true)
    try {
      await updateIngredientPrice(id, newPrice)
      const hist = await getPriceHistory(id as string, 10)
      setHistory(hist)
      setIsEditing(false)
      setShowConfirm(true)
      setTimeout(() => setShowConfirm(false), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  // Affected dishes — uses getMarginForRecipe from store (never computes directly)
  const affectedDishes = useMemo<AffectedDish[]>(() => {
    const { getMarginForRecipe } = useRecipeStore.getState()
    return affectedIds
      .map((rid) => {
        const recipe = recipes.find((r) => r.id === rid)
        if (!recipe) return null
        const margin = getMarginForRecipe(rid)
        if (!margin) return null
        return { recipe, margin }
      })
      .filter((x): x is AffectedDish => x !== null)
  }, [affectedIds, recipes, recipeIngredients, ingredients])

  // Chart data — oldest to newest
  const chartData = useMemo(
    () =>
      [...history]
        .reverse()
        .map((h) => ({ date: h.recorded_at, price: h.price_per_kg })),
    [history]
  )

  // Line colour: up trend = critical, down trend = healthy, flat = watch
  const lineColor = useMemo(() => {
    if (chartData.length < 2) return '#7C3AED'
    const first = chartData[0].price
    const last = chartData[chartData.length - 1].price
    if (last > first) return '#FF505F'
    if (last < first) return '#00DC82'
    return '#FBB924'
  }, [chartData])

  if (!ingredient && !isLoading) {
    return (
      <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
        <GlacierHeader title="Ingredient" showBack breadcrumb="Ingredients" />
        <p style={{ textAlign: 'center', color: '#888888', fontSize: 13, padding: 32 }}>
          Ingredient not found
        </p>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <GlacierHeader
        title={ingredient?.name ?? 'Ingredient'}
        showBack
        breadcrumb="Ingredients"
      />

      <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Section 1: Current price ── */}
        <Card>
          {isLoading && !ingredient ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton height={40} radius={8} width="50%" />
              <Skeleton height={14} radius={4} width="40%" />
            </div>
          ) : ingredient ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ fontSize: 22, color: '#888888', fontWeight: 400 }}>₹</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onFocus={() => setEditFocused(true)}
                      onBlur={() => setEditFocused(false)}
                      autoFocus
                      style={{
                        flex: 1,
                        backgroundColor: '#FFFAF5',
                        border: `0.5px solid ${editFocused ? '#7C3AED' : '#EDE8F5'}`,
                        borderRadius: 10,
                        padding: '8px 12px',
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#1A1A1A',
                        fontFamily: 'inherit',
                        outline: 'none',
                        width: 120,
                      }}
                    />
                    <span style={{ fontSize: 15, color: '#888888' }}>/{displayUnit(ingredient.unit)}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.5px' }}>
                      ₹{ingredient.price_per_kg}
                    </span>
                    <span style={{ fontSize: 15, color: '#888888' }}>/{displayUnit(ingredient.unit)}</span>
                  </div>
                )}

                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditPrice(String(ingredient.price_per_kg))
                      setIsEditing(true)
                    }}
                    aria-label="Edit price"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1 }}
                  >
                    <Edit2 size={16} strokeWidth={1.5} color="#888888" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !editPrice}
                    style={{
                      backgroundColor: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      opacity: !editPrice ? 0.5 : 1,
                      boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                    }}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>

              <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>
                Last updated {relativeTime(ingredient.last_updated)}
              </p>

              {showConfirm && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    color: '#00DC82',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Check size={13} strokeWidth={1.5} />
                  Updated
                </div>
              )}
            </>
          ) : null}
        </Card>

        {/* ── Section 2: Price history chart ── */}
        <Card>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#888888',
              margin: '0 0 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Price history
          </p>

          {isLoading ? (
            <Skeleton height={120} radius={8} />
          ) : chartData.length < 2 ? (
            <p style={{ fontSize: 12, color: '#888888', margin: '20px 0', textAlign: 'center' }}>
              Not enough history yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={shortRelativeTime}
                  tick={{ fontSize: 10, fill: '#888888' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={(v: number) => `₹${v}`}
                  tick={{ fontSize: 10, fill: '#888888' }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '0.5px solid #EDE8F5',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#1A1A1A',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any) => [`₹${val}/${ingredient ? displayUnit(ingredient.unit) : 'kg'}`, 'Price'] as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(label: any) => shortRelativeTime(String(label))}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: lineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* ── Section 3: Affected dishes ── */}
        <div>
          <p style={{ fontSize: 12, color: '#888888', margin: '0 0 8px' }}>
            Dishes using this ingredient
          </p>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton height={80} radius={14} />
              <Skeleton height={80} radius={14} />
            </div>
          ) : affectedDishes.length === 0 ? (
            <Card>
              <p style={{ fontSize: 12, color: '#888888', margin: 0, textAlign: 'center' }}>
                No dishes use this ingredient yet
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {affectedDishes.map(({ recipe, margin }) => (
                <Card key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1A1A1A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {recipe.name}
                    </span>
                    <StatusBadge status={margin.status} />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: margin.status === 'healthy' ? '#00DC82' : margin.status === 'watch' ? '#FBB924' : '#FF505F',
                        flexShrink: 0,
                      }}
                    >
                      {margin.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <MarginBar percent={margin.marginPercent} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: '#888888' }}>
                      Sells for {formatCurrency(recipe.selling_price)}
                    </span>
                    <span style={{ fontSize: 11, color: '#888888' }}>
                      {formatCurrency(margin.profitPerDish)} profit
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 4: Spike info (conditional) ── */}
        {spike && (
          <div
            style={{
              backgroundColor: '#FFF8EC',
              border: '0.5px solid rgba(251,185,36,0.3)',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={14} strokeWidth={1.5} color="#FBB924" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>Price spike detected</span>
            </div>
            <p style={{ fontSize: 12, color: '#1A1A1A', margin: '0 0 6px', lineHeight: 1.5 }}>
              Price changed{' '}
              <span style={{ fontWeight: 600, color: spike.changePercent > 0 ? '#FF505F' : '#00DC82' }}>
                {spike.changePercent > 0 ? '+' : ''}{Math.round(spike.changePercent)}%
              </span>
              {' '}from ₹{spike.previousPrice} to ₹{spike.newPrice}/{ingredient ? displayUnit(ingredient.unit) : 'kg'}
            </p>
            <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>
              {spike.affectedRecipes.length > 0
                ? `${spike.affectedRecipes.length} dish${spike.affectedRecipes.length !== 1 ? 'es' : ''} affected`
                : 'Check your dishes for margin impact'}
            </p>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
