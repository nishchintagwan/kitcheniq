import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, AlertTriangle, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { formatCurrency, formatMargin } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
import Logo from '../components/ui/Logo'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import MarginBar from '../components/ui/MarginBar'
import StatusBadge from '../components/ui/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import Gauge from '../components/ui/Gauge'
import DishPlaceholder from '../components/ui/DishPlaceholder'
import Button from '../components/ui/Button'
import type { MarginResult, Recipe, MarginStatus } from '../types'

interface DishWithMargin {
  recipe: Recipe
  margin: MarginResult
}

function useCountUp(target: number): number {
  const [count, setCount] = useState(0)
  const prevRef = useRef(-1)
  useEffect(() => {
    if (prevRef.current === target) return
    prevRef.current = target
    if (target === 0) { setCount(0); return }
    const DURATION = 800
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min((now - start) / DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setCount(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return count
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatLakhs(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Math.round(n)}`
}

const STATUS_COLOR: Record<MarginStatus, string> = {
  healthy: '#36D399',
  watch: '#F0A93F',
  critical: '#F0596B',
}

const STAT_ITEMS: Array<{ status: MarginStatus }> = [
  { status: 'healthy' },
  { status: 'watch' },
  { status: 'critical' },
]

export default function DashboardScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { recipes, recipeIngredients, fetchRecipes, fetchRecipeIngredients, getAggregateMargin, getEstimatedMonthlySales } = useRecipeStore()
  const { ingredients, fetchIngredients, fetchKbPrices, spikes, dismissedSpikeIds } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [firstName, setFirstName] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const scrollParentRef = useRef<HTMLElement | null>(null)
  const touchStartY = useRef(0)
  const [pullY, setPullY] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const meta = data.session?.user?.user_metadata as Record<string, string> | undefined
      const name = meta?.full_name || meta?.name || ''
      setFirstName(name.split(' ')[0] || '')
    })
  }, [])

  useEffect(() => {
    let el = rootRef.current?.parentElement ?? null
    while (el) {
      const { overflow, overflowY } = getComputedStyle(el)
      if (overflow === 'auto' || overflowY === 'auto') { scrollParentRef.current = el; break }
      el = el.parentElement
    }
  }, [])

  useEffect(() => {
    const restaurantId = restaurant?.id
    if (!restaurantId) return
    let cancelled = false
    setIsLoading(true)
    async function load() {
      // Fetch KB prices in parallel with restaurant data (city used for KB lookup)
      const city = restaurant?.city ?? 'pune'
      await Promise.all([
        fetchRecipes(restaurantId!),
        fetchIngredients(restaurantId!),
        fetchKbPrices(city),
      ])
      if (cancelled) return
      const { recipes: latest } = useRecipeStore.getState()
      await Promise.all(latest.map((r) => fetchRecipeIngredients(r.id)))
      if (!cancelled) setIsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoading) return
    const restaurantId = restaurant?.id
    if (!restaurantId) return
    setAiLoading(true)
    const payload = dishesWithMargins.map(({ recipe, margin }) => ({
      name: recipe.name, category: recipe.category,
      marginPercent: margin.marginPercent, status: margin.status,
      profitPerDish: margin.profitPerDish, sellingPrice: recipe.selling_price,
    }))
    supabase.functions
      .invoke('ai-dashboard-summary', { body: { restaurantId, dishes: payload } })
      .then(({ data }) => { if (data?.summary) setAiSummary(data.summary as string) })
      .catch(() => {})
      .finally(() => setAiLoading(false))
  }, [isLoading, restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dishesWithMargins = useMemo<DishWithMargin[]>(() => {
    if (isLoading) return []
    const { getMarginForRecipe } = useRecipeStore.getState()
    return recipes
      .map((recipe) => { const margin = getMarginForRecipe(recipe.id); return margin ? { recipe, margin } : null })
      .filter((d): d is DishWithMargin => d !== null)
      .sort((a, b) => a.margin.marginPercent - b.margin.marginPercent)
  }, [recipes, recipeIngredients, ingredients, isLoading])

  const counts = useMemo(() => ({
    healthy: dishesWithMargins.filter((d) => d.margin.status === 'healthy').length,
    watch: dishesWithMargins.filter((d) => d.margin.status === 'watch').length,
    critical: dishesWithMargins.filter((d) => d.margin.status === 'critical').length,
  }), [dishesWithMargins])

  const healthyCount = useCountUp(counts.healthy)
  const watchCount = useCountUp(counts.watch)
  const criticalCount = useCountUp(counts.critical)
  const animatedCounts: Record<MarginStatus, number> = { healthy: healthyCount, watch: watchCount, critical: criticalCount }

  const activeSpikes = spikes.filter((s) => !dismissedSpikeIds.includes(s.ingredient.id))
  const aggregateMargin = isLoading ? 0 : getAggregateMargin()
  const { sales, cogs } = isLoading ? { sales: 0, cogs: 0 } : getEstimatedMonthlySales()

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

  function handleTouchStart(e: React.TouchEvent) {
    const container = scrollParentRef.current
    if (container && container.scrollTop === 0) touchStartY.current = e.touches[0].clientY
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === 0) return
    const diff = e.touches[0].clientY - touchStartY.current
    if (diff > 0) setPullY(Math.min(Math.round(diff * 0.4), 64))
    else { touchStartY.current = 0; setPullY(0) }
  }
  function handleTouchEnd() {
    if (pullY >= 55) handleRefresh()
    touchStartY.current = 0; setPullY(0)
  }

  const greetingName = firstName || (restaurant?.name ? restaurant.name.split(' ')[0] : '')

  return (
    <div
      ref={rootRef}
      style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <GlacierHeader
        leftElement={<Logo />}
        rightElement={
          <Bell
            size={20}
            strokeWidth={1.5}
            color={activeSpikes.length > 0 ? '#F0A93F' : '#6B7588'}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/alerts')}
          />
        }
      />

      {/* Pull-to-refresh indicator */}
      {pullY > 0 && (
        <div style={{ height: pullY, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid #3FC6F0', borderTopColor: 'transparent',
            opacity: pullY / 64,
          }} />
        </div>
      )}

      <div style={{ padding: '0 16px 96px' }}>

        {/* Greeting */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#F4F6FA', margin: '0 0 2px', letterSpacing: '-0.4px' }}>
            {getGreeting()}{greetingName ? `, ${greetingName}` : ''} 👋
          </p>
          <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0 }}>
            Here's how your kitchen is performing today.
          </p>
        </div>

        {/* Stat row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {STAT_ITEMS.map(({ status }) => (
            <motion.div
              key={status}
              style={{ flex: 1, cursor: 'pointer' }}
              whileTap={{ scale: 0.96, opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={() => navigate(`/recipes?status=${status}`)}
            >
              <StatCard status={status} value={animatedCounts[status]} />
            </motion.div>
          ))}
        </div>

        {/* Gauge card */}
        <div
          style={{
            backgroundColor: '#161D2B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 9, fontWeight: 800, color: '#9AA4B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
            Total margin
          </p>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Skeleton height={140} radius={9999} width="140px" />
            </div>
          ) : (
            <Gauge
              value={aggregateMargin}
              label="Overall"
              sublabel="+0.0% vs LW"
              size={140}
            />
          )}

          {/* Sales / COGS row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            {[
              { label: 'Sales', value: sales, trend: '+12.4% vs LW', trendColor: '#36D399' },
              { label: 'COGS', value: cogs, trend: '+7.3% vs LW', trendColor: '#F0A93F' },
            ].map(({ label, value, trend, trendColor }) => (
              <div
                key={label}
                style={{
                  backgroundColor: '#1B2436',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: 9, fontWeight: 800, color: '#9AA4B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                  {label}
                </p>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#F4F6FA', margin: '0 0 2px', letterSpacing: '-0.5px' }}>
                  {isLoading ? '–' : formatLakhs(value)}
                </p>
                <p style={{ fontSize: 10, color: trendColor, margin: 0 }}>{trend}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spike alert */}
        {activeSpikes.length > 0 && (
          <motion.div
            whileTap={{ scale: 0.98, opacity: 0.85 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              backgroundColor: 'rgba(240,89,107,0.14)',
              border: '1px solid rgba(240,89,107,0.3)',
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/alerts')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={16} strokeWidth={1.5} color="#F0596B" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F4F6FA', margin: '0 0 2px' }}>
                  {activeSpikes.length === 1
                    ? `${activeSpikes[0].ingredient.name} prices up ${Math.abs(Math.round(activeSpikes[0].changePercent))}%`
                    : `${activeSpikes.length} ingredient price spikes detected`}
                </p>
                <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0 }}>
                  Tap for AI fix · impacting your dishes
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI summary */}
        <div
          style={{
            backgroundColor: '#161D2B',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Sparkles size={16} strokeWidth={1.5} color="#3FC6F0" />
            <span style={{ fontSize: 9, color: '#3FC6F0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              AI insight
            </span>
          </div>
          {aiLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton height={14} radius={4} />
              <Skeleton height={14} radius={4} width="70%" />
            </div>
          ) : aiSummary ? (
            <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0, lineHeight: 1.6 }}>{aiSummary}</p>
          ) : null}
        </div>

        {/* Dish list */}
        <p style={{ fontSize: 9, fontWeight: 800, color: '#6B7588', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
          Your menu
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={90} radius={14} />)}
          </div>
        ) : dishesWithMargins.length === 0 ? (
          <div
            style={{
              backgroundColor: '#161D2B',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <DishPlaceholder name="?" size={52} />
            <p style={{ fontSize: 13, color: '#9AA4B8', margin: '12px 0 16px' }}>No dishes yet</p>
            <Button onClick={() => navigate('/recipes/new')}>Add your first dish</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dishesWithMargins.map(({ recipe, margin }) => (
              <Card
                key={recipe.id}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <DishPlaceholder name={recipe.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: '#F4F6FA',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {recipe.name}
                    </p>
                    <p style={{ fontSize: 10, color: '#9AA4B8', margin: '1px 0 0' }}>
                      {recipe.category} · {formatCurrency(recipe.selling_price)}
                    </p>
                  </div>
                  <StatusBadge status={margin.status} />
                </div>
                <MarginBar percent={margin.marginPercent} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: '#9AA4B8' }}>
                    Margin {formatMargin(margin.marginPercent)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[margin.status] }}>
                    {formatCurrency(margin.profitPerDish)}/dish
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
