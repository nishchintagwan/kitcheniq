import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, UtensilsCrossed } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useIngredientStore } from '../stores/ingredientStore'
import { formatCurrency, formatMargin } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
import Card from '../components/ui/Card'
import MarginBar from '../components/ui/MarginBar'
import StatusBadge from '../components/ui/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import Button from '../components/ui/Button'
import BottomNav from '../components/ui/BottomNav'
import type { MarginResult, Recipe, MarginStatus } from '../types'

interface DishWithMargin {
  recipe: Recipe
  margin: MarginResult
}

const STATUS_FILTERS = ['all', 'healthy', 'watch', 'critical'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_CHIP_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  healthy: 'Healthy',
  watch: 'Watch',
  critical: 'Critical',
}

const STATUS_COLOR: Record<MarginStatus, string> = {
  healthy: '#00DC82',
  watch: '#FBB924',
  critical: '#FF505F',
}

function matchesStatus(margin: MarginResult, filter: string): boolean {
  if (filter === 'all') return true
  if (filter === 'healthy') return margin.marginPercent >= 50
  if (filter === 'watch') return margin.marginPercent >= 30 && margin.marginPercent < 50
  if (filter === 'critical') return margin.marginPercent < 30
  return true
}

export default function RecipeListScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { restaurant } = useRestaurantStore()
  const { recipes, recipeIngredients, fetchRecipes, fetchRecipeIngredients } = useRecipeStore()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>(
    () => searchParams.get('status') ?? 'all'
  )

  async function loadData(restaurantId: string) {
    setIsLoading(true)
    setHasError(false)
    try {
      await Promise.all([fetchRecipes(restaurantId), fetchIngredients(restaurantId)])
      const { recipes: latest } = useRecipeStore.getState()
      await Promise.all(latest.map((r) => fetchRecipeIngredients(r.id)))
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!restaurant?.id) return
    loadData(restaurant.id)
  }, [restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dishesWithMargins = useMemo<DishWithMargin[]>(() => {
    if (isLoading) return []
    const { getMarginForRecipe } = useRecipeStore.getState()
    return recipes
      .map((recipe) => {
        const margin = getMarginForRecipe(recipe.id)
        return margin ? { recipe, margin } : null
      })
      .filter((d): d is DishWithMargin => d !== null)
  }, [recipes, recipeIngredients, ingredients, isLoading])

  const categories = useMemo(
    () => [...new Set(dishesWithMargins.map((d) => d.recipe.category))].sort(),
    [dishesWithMargins]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return dishesWithMargins.filter(({ recipe, margin }) => {
      const isStatusFilter = (STATUS_FILTERS as readonly string[]).includes(activeFilter)
      if (isStatusFilter && !matchesStatus(margin, activeFilter)) return false
      if (!isStatusFilter && recipe.category !== activeFilter) return false
      if (q && !recipe.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [dishesWithMargins, activeFilter, search])

  const chips = [
    ...STATUS_FILTERS.map((id) => ({ id, label: STATUS_CHIP_LABEL[id] })),
    ...categories.map((c) => ({ id: c, label: c })),
  ]

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <GlacierHeader
        title="Your menu"
        subtitle={
          isLoading ? undefined : `${recipes.length} dish${recipes.length !== 1 ? 'es' : ''}`
        }
        rightElement={
          <motion.button
            whileTap={{ scale: 0.88, opacity: 0.75 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => navigate('/recipes/new')}
            aria-label="Add dish"
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
            <Plus size={18} strokeWidth={1.5} color="#FFFFFF" />
          </motion.button>
        }
      />

      <div style={{ paddingBottom: 96 }}>
        {/* Filter chips — horizontal scroll, scrollbar hidden */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            padding: '16px 16px 4px',
            scrollbarWidth: 'none',
          }}
        >
          {chips.map((chip) => {
            const isActive = chip.id === activeFilter
            return (
              <motion.button
                key={chip.id}
                whileTap={{ scale: 0.94, opacity: 0.85 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => setActiveFilter(chip.id)}
                style={{
                  flexShrink: 0,
                  backgroundColor: isActive ? '#7C3AED' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#1A1A1A',
                  border: `0.5px solid ${isActive ? '#7C3AED' : '#EDE8F5'}`,
                  borderRadius: 9999,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
              </motion.button>
            )
          })}
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', margin: '8px 16px 0' }}>
          <Search
            size={14}
            strokeWidth={1.5}
            color="#888888"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#FFFFFF',
              border: '0.5px solid #EDE8F5',
              borderRadius: 10,
              padding: '10px 12px 10px 34px',
              fontSize: 13,
              color: '#1A1A1A',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ padding: '12px 16px 0' }}>
          {hasError ? (
            <Card onClick={() => restaurant?.id && loadData(restaurant.id)}>
              <p style={{ fontSize: 13, color: '#888888', textAlign: 'center', margin: 0 }}>
                Something went wrong — tap to retry
              </p>
            </Card>
          ) : isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={112} radius={14} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <UtensilsCrossed size={44} strokeWidth={1.5} color="#EDE8F5" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: '0 0 6px' }}>
                {dishesWithMargins.length === 0 ? 'No dishes yet' : 'No matches'}
              </p>
              <p style={{ fontSize: 12, color: '#888888', margin: '0 0 24px' }}>
                {dishesWithMargins.length === 0
                  ? 'Add your first dish to track margins'
                  : 'Try a different filter or search term'}
              </p>
              {dishesWithMargins.length === 0 && (
                <Button onClick={() => navigate('/recipes/new')}>
                  Add your first dish
                </Button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(({ recipe, margin }) => {
                const statusColor = STATUS_COLOR[margin.status]
                return (
                  <Card key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)}>
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
                        justifyContent: 'space-between',
                        marginTop: 6,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 11, color: '#888888' }}>
                        Cost: {formatCurrency(margin.totalCost)}
                      </span>
                      <span style={{ fontSize: 11, color: statusColor }}>
                        {formatCurrency(margin.profitPerDish)} profit
                      </span>
                    </div>

                    {/* Row 4: wastage / overhead / serves detail */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 10, color: '#888888' }}>
                        {recipe.wastage_percent}% wastage
                      </span>
                      <span style={{ fontSize: 10, color: '#888888' }}>
                        {recipe.overhead_percent}% overhead
                      </span>
                      <span style={{ fontSize: 10, color: '#888888' }}>
                        {recipe.serves} {recipe.serves === 1 ? 'serving' : 'servings'}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
