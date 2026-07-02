import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { ingredientCost, formatCurrency, computeMarginTrend } from '../lib/costCalculator'
import { getPriceHistory } from '../lib/queries'
import MarginBar from '../components/ui/MarginBar'
import StatusBadge from '../components/ui/StatusBadge'
import AiTipCard from '../components/ui/AiTipCard'
import Skeleton from '../components/ui/Skeleton'
import Button from '../components/ui/Button'
import BottomNav from '../components/ui/BottomNav'
import DishPlaceholder from '../components/ui/DishPlaceholder'
import Sparkline from '../components/ui/Sparkline'
import type { MarginStatus } from '../types'

const STATUS_COLOR: Record<MarginStatus, string> = {
  healthy: '#36D399',
  watch: '#F0A93F',
  critical: '#F0596B',
}

function useCountUpFloat(target: number): number {
  const [value, setValue] = useState(0)
  const prevTarget = useRef(-1)
  useEffect(() => {
    if (prevTarget.current === target) return
    prevTarget.current = target
    setValue(0)
    if (target === 0) return
    const DURATION = 800
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min((now - start) / DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased * 10) / 10)
      if (t < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}

export default function RecipeDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { recipes, recipeIngredients, fetchRecipeIngredients } = useRecipeStore()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [aiTip, setAiTip] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [trendData, setTrendData] = useState<number[] | null>(null)
  const [trendLoading, setTrendLoading] = useState(true)

  const recipe = recipes.find((r) => r.id === id)
  const items = id ? (recipeIngredients[id] ?? []) : []

  useEffect(() => {
    if (!id) return
    async function load() {
      const needsIngredients = !recipeIngredients[id!]
      const needsPrices = restaurant?.id && ingredients.length === 0
      await Promise.all([
        needsIngredients ? fetchRecipeIngredients(id!) : Promise.resolve(),
        needsPrices ? fetchIngredients(restaurant!.id) : Promise.resolve(),
      ])
      setDataLoading(false)
    }
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const liveMargin = useMemo(() => {
    if (!id) return null
    return useRecipeStore.getState().getMarginForRecipe(id)
  }, [id, recipeIngredients, ingredients])

  const animatedMargin = useCountUpFloat(liveMargin?.marginPercent ?? 0)

  const ingredientRows = useMemo(() => {
    if (!recipe) return []
    return items
      .map((ri) => {
        const ing = ingredients.find((i) => i.id === ri.ingredient_id)
        if (!ing) return null
        const cost = ingredientCost(ri.quantity, ri.unit, ing.price_per_kg) / Math.max(recipe.serves, 1)
        return { ri, ing, cost }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.cost - a.cost)
  }, [items, ingredients, recipe])

  // Load AI tip
  useEffect(() => {
    if (!id) return
    const margin = useRecipeStore.getState().getMarginForRecipe(id)
    if (!margin || margin.status === 'healthy') { setAiLoading(false); return }
    async function loadTip() {
      try {
        const { data: cached } = await supabase
          .from('ai_tips').select('tip_text').eq('recipe_id', id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (cached?.tip_text) { setAiTip(cached.tip_text as string); setAiLoading(false); return }
        const { recipes: allRecipes, recipeIngredients: allItems } = useRecipeStore.getState()
        const { data } = await supabase.functions.invoke('ai-tip', {
          body: { recipeId: id, recipe: allRecipes.find((r) => r.id === id), ingredients: allItems[id ?? ''] ?? [], margin },
        })
        if (data?.tip) setAiTip(data.tip as string)
      } catch { /* silent */ } finally { setAiLoading(false) }
    }
    loadTip()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute 7-day trend
  useEffect(() => {
    if (!recipe || items.length === 0) { setTrendLoading(false); return }
    setTrendLoading(true)
    computeMarginTrend(recipe, items, getPriceHistory)
      .then((data) => setTrendData(data))
      .catch(() => setTrendData(null))
      .finally(() => setTrendLoading(false))
  }, [recipe?.id, items.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!recipe) {
    return (
      <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
        <div style={{ padding: '16px 16px 0' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={18} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
          </button>
        </div>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#9AA4B8', fontSize: 13 }}>Recipe not found</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const statusColor = liveMargin ? STATUS_COLOR[liveMargin.status] : '#9AA4B8'

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>

      {/* Top navigation row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <ArrowLeft size={18} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 11, color: '#9AA4B8' }}>Recipes</span>
        </button>
        <button
          onClick={() => navigate(`/recipes/${id}/edit`)}
          aria-label="Edit recipe"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1 }}
        >
          <MoreVertical size={18} strokeWidth={1.5} color="#9AA4B8" />
        </button>
      </div>

      {/* Dish hero row */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <DishPlaceholder name={recipe.name} size={88} shape="circle" />
        <div style={{ flex: 1 }}>
          {liveMargin && <StatusBadge status={liveMargin.status} />}
          <p style={{ fontSize: 21, fontWeight: 800, color: '#F4F6FA', margin: '4px 0 2px', letterSpacing: '-0.4px', lineHeight: 1.1 }}>
            {recipe.name}
          </p>
          <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0 }}>
            {recipe.category} · serves {recipe.serves}
          </p>
        </div>
      </div>

      <div style={{ padding: '14px 16px 96px' }}>

        {dataLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={160} radius={14} />
            <Skeleton height={100} radius={14} />
            <Skeleton height={120} radius={14} />
          </div>
        ) : (
          <>
            {/* Margin hero card */}
            <div
              style={{
                backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: 16, marginBottom: 12,
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 800, color: '#9AA4B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                Margin
              </p>
              <p style={{ fontSize: 42, fontWeight: 800, color: statusColor, margin: '0 0 2px', letterSpacing: '-1px', lineHeight: 1 }}>
                {animatedMargin.toFixed(1)}%
              </p>
              <p style={{ fontSize: 11, color: '#36D399', margin: '0 0 10px' }}>+0.0% vs LW</p>
              <MarginBar percent={liveMargin?.marginPercent ?? 0} height={5} />
              {liveMargin && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 12 }}>
                  {[
                    { label: 'Selling Price', value: formatCurrency(recipe.selling_price) },
                    { label: 'Food Cost', value: formatCurrency(liveMargin.totalCost) },
                    { label: 'Margin ₹', value: formatCurrency(liveMargin.profitPerDish), color: statusColor },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ backgroundColor: '#1B2436', borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 9, color: '#6B7588', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 3px' }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: color || '#F4F6FA', margin: 0 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI tip (watch/critical only) */}
            {liveMargin && liveMargin.status !== 'healthy' && (
              <div style={{ marginBottom: 12 }}>
                <AiTipCard tip={aiTip} isLoading={aiLoading} />
              </div>
            )}

            {/* 7-day trend */}
            <div
              style={{
                backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: 16, marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#F4F6FA' }}>Margin Trend</span>
                <span style={{ fontSize: 10, color: '#9AA4B8' }}>7 Days ▾</span>
              </div>
              {trendLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={18} radius={4} />)}
                </div>
              ) : trendData && trendData.length >= 2 ? (
                <Sparkline data={trendData} color={statusColor} height={56} />
              ) : null}
            </div>

            {/* Cost breakdown */}
            {liveMargin && (
              <div
                style={{
                  backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: 16, marginBottom: 12,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: '#F4F6FA', margin: '0 0 12px' }}>Cost Breakdown</p>
                {[
                  { label: 'Raw ingredients', value: liveMargin.rawCost },
                  { label: `Wastage (${recipe.wastage_percent}%)`, value: liveMargin.wastageCost },
                  { label: `Overhead (${recipe.overhead_percent}%)`, value: liveMargin.overheadCost },
                  { label: 'Total / portion', value: liveMargin.totalCost, bold: true },
                ].map(({ label, value, bold }, idx, arr) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 0',
                      borderTop: idx === arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      borderBottom: idx < arr.length - 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#9AA4B8' }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: bold ? 800 : 700, color: bold ? '#F4F6FA' : '#F4F6FA' }}>
                      {formatCurrency(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Ingredient list */}
            {ingredientRows.length > 0 && (
              <div
                style={{
                  backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: 16, marginBottom: 20,
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 700, color: '#F4F6FA', margin: '0 0 12px' }}>Ingredients by cost</p>
                {ingredientRows.map(({ ri, ing, cost }, idx) => {
                  const isLast = idx === ingredientRows.length - 1
                  return (
                    <div
                      key={ri.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 11, color: '#F4F6FA', margin: '0 0 1px', fontWeight: 600 }}>{ing.name}</p>
                        <p style={{ fontSize: 10, color: '#6B7588', margin: 0 }}>{ri.quantity} {ri.unit}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>
                        {formatCurrency(cost)}/portion
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" fullWidth onClick={() => navigate(`/recipes/${id}/edit`)}>
                Edit Recipe
              </Button>
              <Button fullWidth onClick={() => navigate(`/recipes/${id}/nutrition`)}>
                View Nutrition
              </Button>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
