import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { ingredientCost, formatCurrency, formatMargin } from '../lib/costCalculator'
import DarkHeader from '../components/ui/DarkHeader'
import Card from '../components/ui/Card'
import MarginBar from '../components/ui/MarginBar'
import StatusBadge from '../components/ui/StatusBadge'
import AiTipCard from '../components/ui/AiTipCard'
import Button from '../components/ui/Button'
import BottomNav from '../components/ui/BottomNav'
import type { MarginStatus } from '../types'

const STATUS_COLOR: Record<MarginStatus, string> = {
  healthy: '#00DC82',
  watch: '#FBB924',
  critical: '#FF505F',
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

interface CostRowProps {
  label: string
  amount: number
  total: number
  color: string
}

function CostRow({ label, amount, total, color }: CostRowProps) {
  const pct = total > 0 ? (amount / total) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#888888' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>
          {formatCurrency(amount)}
        </span>
      </div>
      <div style={{ width: '100%', height: 3, backgroundColor: '#F5F0FA', borderRadius: 999 }}>
        <div
          style={{
            width: `${pct}%`,
            height: 3,
            backgroundColor: color,
            borderRadius: 999,
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>
    </div>
  )
}

export default function RecipeDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { recipes, recipeIngredients, fetchRecipeIngredients } = useRecipeStore()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [aiTip, setAiTip] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)

  const recipe = recipes.find((r) => r.id === id)
  const items = id ? (recipeIngredients[id] ?? []) : []

  // Fetch ingredients data if navigated to directly (not from dashboard/list)
  useEffect(() => {
    if (!id) return
    if (!recipeIngredients[id]) fetchRecipeIngredients(id)
    if (restaurant?.id && ingredients.length === 0) fetchIngredients(restaurant.id)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live margin — recomputes if ingredient prices or quantities change
  const liveMargin = useMemo(() => {
    if (!id) return null
    return useRecipeStore.getState().getMarginForRecipe(id)
  }, [id, recipeIngredients, ingredients])

  const animatedMargin = useCountUpFloat(liveMargin?.marginPercent ?? 0)

  // Ingredients sorted by cost contribution, highest first
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

  // Load AI tip — only for watch/critical; healthy dishes never show a tip
  useEffect(() => {
    if (!id) return
    const margin = useRecipeStore.getState().getMarginForRecipe(id)
    if (!margin || margin.status === 'healthy') {
      setAiLoading(false)
      return
    }

    async function loadTip() {
      try {
        const { data: cached } = await supabase
          .from('ai_tips')
          .select('tip_text')
          .eq('recipe_id', id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cached?.tip_text) {
          setAiTip(cached.tip_text as string)
          setAiLoading(false)
          return
        }

        // No valid cache — call Edge Function (built in step 4.5)
        const { recipes: allRecipes, recipeIngredients: allItems } = useRecipeStore.getState()
        const { data } = await supabase.functions.invoke('ai-tip', {
          body: {
            recipeId: id,
            recipe: allRecipes.find((r) => r.id === id),
            ingredients: allItems[id ?? ''] ?? [],
            margin,
          },
        })
        if (data?.tip) setAiTip(data.tip as string)
      } catch {
        // Silent failure — AiTipCard renders nothing on null tip
      } finally {
        setAiLoading(false)
      }
    }

    loadTip()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!recipe) {
    return (
      <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
        <DarkHeader showBack breadcrumb="Menu" title="Recipe" />
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#888888', fontSize: 13 }}>Recipe not found</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const statusColor = liveMargin ? STATUS_COLOR[liveMargin.status] : '#888888'

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <DarkHeader
        title={recipe.name}
        showBack
        breadcrumb="Menu"
        rightElement={
          <button
            onClick={() => navigate(`/recipes/${id}/edit`)}
            aria-label="Edit recipe"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Edit2 size={16} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
          </button>
        }
      />

      <div style={{ padding: '16px 16px 96px' }}>

        {/* ── Section 1: Margin hero ── */}
        <Card>
          <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 8 }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: statusColor,
                letterSpacing: '-1px',
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {animatedMargin.toFixed(1)}%
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              {liveMargin && <StatusBadge status={liveMargin.status} />}
            </div>

            {liveMargin && (
              <p style={{ fontSize: 13, fontWeight: 600, color: statusColor, margin: '0 0 4px' }}>
                {formatCurrency(liveMargin.profitPerDish)} profit per plate
              </p>
            )}

            {liveMargin && (
              <p style={{ fontSize: 11, color: '#888888', margin: '0 0 14px' }}>
                Costs {formatCurrency(liveMargin.totalCost)} to make
              </p>
            )}

            {liveMargin && <MarginBar percent={liveMargin.marginPercent} height={6} />}
          </div>
        </Card>

        {/* ── Section 2: AI tip (watch/critical only) ── */}
        {liveMargin && liveMargin.status !== 'healthy' && (
          <div style={{ marginTop: 12 }}>
            <AiTipCard tip={aiTip} isLoading={aiLoading} />
          </div>
        )}

        {/* ── Section 3: Cost breakdown ── */}
        {liveMargin && (
          <div style={{ marginTop: 12 }}>
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
                Cost breakdown
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#888888' }}>Selling price</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
                  {formatCurrency(recipe.selling_price)}
                </span>
              </div>

              <CostRow
                label="Ingredients (raw)"
                amount={liveMargin.rawCost}
                total={liveMargin.totalCost}
                color="#7C3AED"
              />
              <CostRow
                label={`Wastage (${recipe.wastage_percent}%)`}
                amount={liveMargin.wastageCost}
                total={liveMargin.totalCost}
                color="#FBB924"
              />
              <CostRow
                label={`Overhead (${recipe.overhead_percent}%)`}
                amount={liveMargin.overheadCost}
                total={liveMargin.totalCost}
                color="#888888"
              />

              <div
                style={{
                  borderTop: '0.5px solid #EDE8F5',
                  paddingTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>Total cost</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>
                  {formatCurrency(liveMargin.totalCost)}
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* ── Section 4: Ingredients ── */}
        {ingredientRows.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: '#888888', margin: '0 0 8px' }}>Ingredients</p>
            <Card>
              {ingredientRows.map(({ ri, ing, cost }, idx) => {
                const pct = liveMargin && liveMargin.rawCost > 0
                  ? (cost / liveMargin.rawCost) * 100
                  : 0
                const isLast = idx === ingredientRows.length - 1
                return (
                  <div
                    key={ri.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: isLast ? 0 : 10,
                      marginBottom: isLast ? 0 : 10,
                      borderBottom: isLast ? 'none' : '0.5px solid #EDE8F5',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', margin: '0 0 2px' }}>
                        {ing.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>
                        {ri.quantity} {ri.unit}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', margin: '0 0 2px' }}>
                        {formatCurrency(cost)}
                      </p>
                      <p style={{ fontSize: 11, color: '#888888', margin: 0 }}>
                        {pct.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )
              })}
            </Card>
          </div>
        )}

        {/* ── Section 5: Actions ── */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="ghost" fullWidth onClick={() => navigate(`/recipes/${id}/nutrition`)}>
            Generate nutrition label
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate(`/recipes/${id}/edit`)}>
            Edit recipe
          </Button>
        </div>

      </div>

      <BottomNav />
    </div>
  )
}
