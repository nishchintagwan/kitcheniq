import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
import DishPlaceholder from '../components/ui/DishPlaceholder'
import type { MarginResult, Recipe } from '../types'

interface DishWithMargin {
  recipe: Recipe
  margin: MarginResult
}

type Tab = 'performance' | 'pricing'

const STATUS_COLOR: Record<string, string> = {
  healthy: '#36D399',
  watch: '#F0A93F',
  critical: '#F0596B',
}

export default function RecipeListScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { recipes, recipeIngredients, fetchRecipes, fetchRecipeIngredients } = useRecipeStore()
  const { ingredients, fetchIngredients } = useIngredientStore()

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [search, setSearch] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('performance')

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
      .map((recipe) => { const margin = getMarginForRecipe(recipe.id); return margin ? { recipe, margin } : null })
      .filter((d): d is DishWithMargin => d !== null)
  }, [recipes, recipeIngredients, ingredients, isLoading])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return dishesWithMargins
    return dishesWithMargins.filter(({ recipe }) => recipe.name.toLowerCase().includes(q))
  }, [dishesWithMargins, search])

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader
        title="Dishes"
        subtitle={activeTab === 'performance' ? 'Performance view' : 'Pricing view'}
        rightElement={
          <motion.button
            whileTap={{ scale: 0.88, opacity: 0.75 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => setSearchVisible((v) => !v)}
            aria-label="Toggle search"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            <Search size={18} strokeWidth={1.5} color={searchVisible ? '#3FC6F0' : '#9AA4B8'} />
          </motion.button>
        }
      />

      {/* Collapsible search bar */}
      <AnimatePresence>
        {searchVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{ overflow: 'hidden', padding: '0 16px 10px' }}
          >
            <div style={{ position: 'relative' }}>
              <Search
                size={14} strokeWidth={1.5} color="#6B7588"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes..."
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  backgroundColor: '#1B2436', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 10, padding: '10px 12px 10px 34px',
                  fontSize: 13, color: '#F4F6FA', fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px' }}>
        {(['performance', 'pricing'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              backgroundColor: activeTab === tab ? '#3FC6F0' : 'transparent',
              color: activeTab === tab ? '#04212E' : '#6B7588',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: activeTab === tab ? 700 : 400,
              fontFamily: 'inherit',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        {hasError ? (
          <Card onClick={() => restaurant?.id && loadData(restaurant.id)}>
            <p style={{ fontSize: 13, color: '#9AA4B8', textAlign: 'center', margin: 0 }}>
              Something went wrong — tap to retry
            </p>
          </Card>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={90} radius={14} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 32, textAlign: 'center',
            }}
          >
            <DishPlaceholder name="?" size={64} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#F4F6FA', margin: '12px 0 6px' }}>
              {dishesWithMargins.length === 0 ? 'No dishes yet' : 'No matches'}
            </p>
            <p style={{ fontSize: 12, color: '#9AA4B8', margin: '0 0 24px' }}>
              {dishesWithMargins.length === 0 ? 'Add your first dish to track margins' : 'Try a different search term'}
            </p>
            {dishesWithMargins.length === 0 && (
              <Button onClick={() => navigate('/recipes/new')}>Add your first dish</Button>
            )}
          </div>
        ) : activeTab === 'performance' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(({ recipe, margin }) => (
              <Card key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <DishPlaceholder name={recipe.name} size={44} shape="rounded" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: '#F4F6FA', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9AA4B8' }}>—</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Pricing tab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(({ recipe, margin }) => (
              <Card key={recipe.id} onClick={() => navigate(`/recipes/${recipe.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <DishPlaceholder name={recipe.name} size={44} shape="rounded" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: '#F4F6FA', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {recipe.name}
                    </p>
                    <p style={{ fontSize: 10, color: '#9AA4B8', margin: '1px 0 0' }}>{recipe.category}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                  {[
                    { label: 'Selling', value: formatCurrency(recipe.selling_price) },
                    { label: 'Cost', value: formatCurrency(margin.totalCost) },
                    { label: 'Margin', value: formatCurrency(margin.profitPerDish), color: STATUS_COLOR[margin.status] },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ backgroundColor: '#1B2436', borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 9, color: '#6B7588', margin: '0 0 3px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: color || '#F4F6FA', margin: 0 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        onClick={() => navigate('/recipes/new')}
        aria-label="Add dish"
        style={{
          position: 'fixed', bottom: 90, right: 'max(20px, calc((100vw - 430px) / 2 + 20px))',
          width: 52, height: 52, borderRadius: '50%',
          backgroundColor: '#3FC6F0',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(63,198,240,0.35)',
          zIndex: 50,
        }}
      >
        <Plus size={22} strokeWidth={1.5} color="#04212E" />
      </motion.button>

      <BottomNav />
    </div>
  )
}
