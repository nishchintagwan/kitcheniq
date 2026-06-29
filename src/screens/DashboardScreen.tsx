import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, AlertTriangle, X, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { formatCurrency, formatMargin } from '../lib/costCalculator'
import DarkHeader from '../components/ui/DarkHeader'
import Logo from '../components/ui/Logo'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import MarginBar from '../components/ui/MarginBar'
import StatusBadge from '../components/ui/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import type { MarginResult, Recipe, MarginStatus } from '../types'

interface DishWithMargin {
  recipe: Recipe
  margin: MarginResult
}

// Counts up from 0 → target over ~800ms using ease-out cubic (feels springy)
function useCountUp(target: number): number {
  const [count, setCount] = useState(0)
  const prevRef = useRef(-1)

  useEffect(() => {
    if (prevRef.current === target) return
    prevRef.current = target

    if (target === 0) {
      setCount(0)
      return
    }

    const DURATION = 800
    const start = performance.now()
    let raf: number

    function tick(now: number) {
      const t = Math.min((now - start) / DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(target * eased))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setCount(target)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return count
}

const STATUS_COLOR: Record<MarginStatus, string> = {
  healthy:  '#00DC82',
  watch:    '#FBB924',
  critical: '#FF505F',
}

const STAT_ITEMS: Array<{ status: MarginStatus; label: string }> = [
  { status: 'healthy',  label: 'Healthy'  },
  { status: 'watch',    label: 'Watch'    },
  { status: 'critical', label: 'Critical' },
]

export default function DashboardScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const {
    recipes,
    recipeIngredients,
    fetchRecipes,
    fetchRecipeIngredients,
  } = useRecipeStore()
  const { ingredients, fetchIngredients, spikes } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Pull-to-refresh
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollParentRef = useRef<HTMLElement | null>(null)
  const touchStartY = useRef(0)
  const [pullY, setPullY] = useState(0)

  // Locate scrollable ancestor once (App.tsx's overflow:auto div)
  useEffect(() => {
    let el = rootRef.current?.parentElement ?? null
    while (el) {
      const { overflow, overflowY } = getComputedStyle(el)
      if (overflow === 'auto' || overflowY === 'auto') {
        scrollParentRef.current = el
        break
      }
      el = el.parentElement
    }
  }, [])

  // Load recipes + ingredients + recipeIngredients
  useEffect(() => {
    const restaurantId = restaurant?.id
    if (!restaurantId) return

    let cancelled = false
    setIsLoading(true)

    async function load() {
      await Promise.all([
        fetchRecipes(restaurantId),
        fetchIngredients(restaurantId),
      ])
      if (cancelled) return
      const { recipes: latest } = useRecipeStore.getState()
      await Promise.all(latest.map((r) => fetchRecipeIngredients(r.id)))
      if (!cancelled) setIsLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [restaurant?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Call Edge Function once dishes are loaded — it handles caching internally
  useEffect(() => {
    if (isLoading) return
    const restaurantId = restaurant?.id
    if (!restaurantId) return

    setAiLoading(true)
    const payload = dishesWithMargins.map(({ recipe, margin }) => ({
      name: recipe.name,
      category: recipe.category,
      marginPercent: margin.marginPercent,
      status: margin.status,
      profitPerDish: margin.profitPerDish,
      sellingPrice: recipe.selling_price,
    }))

    supabase.functions
      .invoke('ai-dashboard-summary', { body: { restaurantId, dishes: payload } })
      .then(({ data }) => {
        if (data?.summary) setAiSummary(data.summary as string)
        setAiLoading(false)
      })
      .catch(() => setAiLoading(false))
  }, [isLoading, restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute margins live — getMarginForRecipe reads current ingredient prices
  const dishesWithMargins = useMemo<DishWithMargin[]>(() => {
    if (isLoading) return []
    const { getMarginForRecipe } = useRecipeStore.getState()
    return recipes
      .map((recipe) => {
        const margin = getMarginForRecipe(recipe.id)
        return margin ? { recipe, margin } : null
      })
      .filter((d): d is DishWithMargin => d !== null)
      .sort((a, b) => a.margin.marginPercent - b.margin.marginPercent) // worst first
  }, [recipes, recipeIngredients, ingredients, isLoading])

  const counts = useMemo(() => ({
    healthy:  dishesWithMargins.filter((d) => d.margin.status === 'healthy').length,
    watch:    dishesWithMargins.filter((d) => d.margin.status === 'watch').length,
    critical: dishesWithMargins.filter((d) => d.margin.status === 'critical').length,
  }), [dishesWithMargins])

  const healthyCount  = useCountUp(counts.healthy)
  const watchCount    = useCountUp(counts.watch)
  const criticalCount = useCountUp(counts.critical)

  const animatedCounts: Record<MarginStatus, number> = {
    healthy:  healthyCount,
    watch:    watchCount,
    critical: criticalCount,
  }

  const activeSpikes = spikes.filter((s) => !dismissedIds.has(s.ingredient.id))

  function handleRefresh() {
    const restaurantId = restaurant?.id
    if (!restaurantId) return
    setIsLoading(true)
    Promise.all([fetchRecipes(restaurantId), fetchIngredients(restaurantId)]).then(async () => {
      const { recipes: latest } = useRecipeStore.getState()
      await Promise.all(latest.map((r) => fetchRecipeIngredients(r.id)))
      setIsLoading(false)
    })
  }

  // Touch handlers for pull-to-refresh
  function handleTouchStart(e: React.TouchEvent) {
    const container = scrollParentRef.current
    if (container && container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === 0) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) {
      setPullY(Math.min(Math.round(diff * 0.4), 64))
    } else {
      touchStartY.current = 0
      setPullY(0)
    }
  }

  function handleTouchEnd() {
    if (pullY >= 55) handleRefresh()
    touchStartY.current = 0
    setPullY(0)
  }

  return (
    <div
      ref={rootRef}
      style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <DarkHeader
        leftElement={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size={22} />
            <span
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.3px',
              }}
            >
              KitchenIQ
            </span>
          </div>
        }
        rightElement={<Bell size={18} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />}
      />

      {/* Pull-to-refresh indicator */}
      {pullY > 0 && (
        <div
          style={{
            height: pullY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid #7C3AED',
              borderTopColor: 'transparent',
              opacity: pullY / 64,
            }}
          />
        </div>
      )}

      <div style={{ padding: '16px 16px 96px' }}>

        {/* ── Section 1: AI summary ── */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            border: '0.5px solid #EDE8F5',
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={14} strokeWidth={1.5} color="#7C3AED" />
            <span style={{ fontSize: 9, color: '#7C3AED', fontWeight: 600, letterSpacing: '0.03em' }}>
              AI insight
            </span>
          </div>

          {aiLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton height={14} radius={4} />
              <Skeleton height={14} radius={4} width="70%" />
            </div>
          ) : aiSummary ? (
            <p style={{ fontSize: 12, color: '#1A1A1A', margin: 0, lineHeight: 1.55 }}>
              {aiSummary}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#888888', margin: 0, lineHeight: 1.55 }}>
              Calculating your menu performance...
            </p>
          )}
        </div>

        {/* ── Section 2: Stat blocks ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {STAT_ITEMS.map(({ status }) => (
            <motion.div
              key={status}
              style={{ flex: 1, cursor: 'pointer' }}
              whileTap={{ scale: 0.95, opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => navigate(`/recipes?status=${status}`)}
            >
              <StatCard status={status} value={animatedCounts[status]} />
            </motion.div>
          ))}
        </div>

        {/* ── Section 3: Alert strips ── */}
        {activeSpikes.map((spike) => (
          <motion.div
            key={spike.ingredient.id}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              backgroundColor: '#FFF8EC',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/alerts/${spike.ingredient.id}`)}
          >
            <AlertTriangle size={14} strokeWidth={1.5} color="#F59E0B" />
            <span style={{ flex: 1, fontSize: 12, color: '#1A1A1A', lineHeight: 1.4 }}>
              {spike.ingredient.name} price changed{' '}
              {spike.changePercent > 0 ? '+' : ''}
              {Math.round(spike.changePercent)}% — tap to review affected dishes
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDismissedIds((prev) => new Set([...prev, spike.ingredient.id]))
              }}
              aria-label="Dismiss alert"
              style={{
                background: 'none',
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                color: '#888888',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </motion.div>
        ))}

        {/* ── Section 4: Dish list header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, color: '#888888' }}>Your menu</span>
          <span style={{ fontSize: 11, color: '#7C3AED' }}>Sort by: Worst first</span>
        </div>

        {/* ── Section 5: Dish list / skeletons ── */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={90} radius={14} />
            ))}
          </div>
        ) : dishesWithMargins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 13, color: '#888888', margin: '0 0 12px' }}>No dishes yet</p>
            <button
              onClick={() => navigate('/recipes/new')}
              style={{
                color: '#7C3AED',
                fontSize: 13,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Add your first dish →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dishesWithMargins.map(({ recipe, margin }) => {
              const statusColor = STATUS_COLOR[margin.status]
              return (
                <Card
                  key={recipe.id}
                  onClick={() => navigate(`/recipes/${recipe.id}`)}
                >
                  {/* Row 1: name + category chip + status badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#1A1A1A',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {recipe.name}
                    </span>
                    <span
                      style={{
                        backgroundColor: '#F5F0FA',
                        color: '#7C3AED',
                        fontSize: 9,
                        borderRadius: 9999,
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {recipe.category}
                    </span>
                    <StatusBadge status={margin.status} />
                  </div>

                  {/* Row 2: selling price + margin % */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#888888' }}>
                      Sells for {formatCurrency(recipe.selling_price)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>
                      {formatMargin(margin.marginPercent)}
                    </span>
                  </div>

                  {/* MarginBar */}
                  <MarginBar percent={margin.marginPercent} />

                  {/* Row 3: cost + profit */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 6,
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#888888' }}>
                      Cost: {formatCurrency(margin.totalCost)}
                    </span>
                    <span style={{ fontSize: 11, color: statusColor }}>
                      {formatCurrency(margin.profitPerDish)} profit
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
