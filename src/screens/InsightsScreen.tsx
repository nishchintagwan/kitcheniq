import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { getMenuInsights, dismissInsight, applyReprice } from '../lib/queries'
import DarkHeader from '../components/ui/DarkHeader'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import type { AiInsight } from '../types'

interface SectionHeaderProps {
  label: string
  count: number
  accentColor: string
  isOpen: boolean
  onToggle: () => void
}

function SectionHeader({ label, count, accentColor, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '10px 0',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{label}</span>
        {count > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: accentColor,
              backgroundColor: `${accentColor}18`,
              borderRadius: 9999,
              padding: '2px 7px',
              lineHeight: 1.6,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {isOpen
        ? <ChevronUp size={14} strokeWidth={1.5} color="#888888" />
        : <ChevronDown size={14} strokeWidth={1.5} color="#888888" />
      }
    </motion.button>
  )
}

export default function InsightsScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const { recipes, fetchRecipes, updateRecipePrice } = useRecipeStore()

  const [insights, setInsights] = useState<AiInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [repriceOpen, setRepriceOpen] = useState(true)
  const [promoteOpen, setPromoteOpen] = useState(true)
  const [removeOpen, setRemoveOpen] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const repriceInsights = insights.filter((i) => i.insight_type === 'reprice')
  const promoteInsights = insights.filter((i) => i.insight_type === 'promote')
  const removeInsights  = insights.filter((i) => i.insight_type === 'remove')
  const hasAnyInsights  = repriceInsights.length > 0 || promoteInsights.length > 0 || removeInsights.length > 0

  async function loadInsights(restaurantId: string) {
    setIsLoading(true)
    if (recipes.length === 0) await fetchRecipes(restaurantId)
    const data = await getMenuInsights(restaurantId)
    setInsights(data)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!restaurant?.id) return
    loadInsights(restaurant.id)
  }, [restaurant?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApply(insight: AiInsight) {
    if (!insight.recipe_id) return
    const suggestedPrice = Number(insight.data?.suggested_price)
    if (!suggestedPrice || suggestedPrice <= 0) return
    setApplyingId(insight.id)
    try {
      await applyReprice(insight.recipe_id, suggestedPrice)
      await dismissInsight(insight.id)
      updateRecipePrice(insight.recipe_id, suggestedPrice)
      setInsights((prev) => prev.filter((i) => i.id !== insight.id))
    } finally {
      setApplyingId(null)
    }
  }

  async function handleRefresh() {
    if (!restaurant?.id) return
    setIsRefreshing(true)
    try {
      await supabase.functions.invoke('ai-menu-optimisation', {
        body: { restaurantId: restaurant.id },
      })
    } catch {
      // If function fails, still reload existing insights
    }
    await loadInsights(restaurant.id)
    setIsRefreshing(false)
  }

  function recipeName(insight: AiInsight): string {
    if (!insight.recipe_id) return ''
    return recipes.find((r) => r.id === insight.recipe_id)?.name ?? ''
  }

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <DarkHeader title="AI insights" subtitle="Updated weekly" />

      <div style={{ padding: '16px 16px 96px' }}>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={48} radius={10} />
            <Skeleton height={90} radius={14} />
            <Skeleton height={90} radius={14} />
            <Skeleton height={48} radius={10} />
            <Skeleton height={90} radius={14} />
          </div>
        ) : !hasAnyInsights ? (

          /* ── Empty state ── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '64px 24px',
              textAlign: 'center',
            }}
          >
            <Sparkles size={32} strokeWidth={1.5} color="#7C3AED" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: '0 0 8px' }}>
              No urgent actions right now
            </p>
            <p style={{ fontSize: 13, color: '#888888', margin: '0 0 24px', lineHeight: 1.5 }}>
              Your menu is healthy. Tap refresh to get the latest analysis.
            </p>
            <motion.button
              whileTap={{ scale: 0.96, opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                backgroundColor: 'transparent',
                color: '#7C3AED',
                border: '0.5px solid #EDE8F5',
                borderRadius: 9999,
                padding: '10px 20px',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: isRefreshing ? 0.5 : 1,
              }}
            >
              <RotateCcw
                size={13}
                strokeWidth={1.5}
                style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined}
              />
              {isRefreshing ? 'Refreshing…' : 'Refresh insights'}
            </motion.button>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

            {/* ── Section 1: Reprice ── */}
            {repriceInsights.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionHeader
                  label="Reprice"
                  count={repriceInsights.length}
                  accentColor="#FBB924"
                  isOpen={repriceOpen}
                  onToggle={() => setRepriceOpen((v) => !v)}
                />
                <AnimatePresence initial={false}>
                  {repriceOpen && (
                    <motion.div
                      key="reprice-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                        {repriceInsights.map((insight) => (
                          <Card key={insight.id}>
                            {recipeName(insight) ? (
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>
                                {recipeName(insight)}
                              </p>
                            ) : null}
                            <p
                              style={{
                                fontSize: 12,
                                color: '#1A1A1A',
                                margin: '0 0 12px',
                                lineHeight: 1.5,
                              }}
                            >
                              {insight.message}
                            </p>
                            <motion.button
                              whileTap={{ scale: 0.96, opacity: 0.85 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              onClick={() => handleApply(insight)}
                              disabled={applyingId === insight.id}
                              style={{
                                backgroundColor: 'transparent',
                                color: applyingId === insight.id ? '#888888' : '#7C3AED',
                                border: '0.5px solid #EDE8F5',
                                borderRadius: 8,
                                padding: '8px 16px',
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                cursor: applyingId === insight.id ? 'not-allowed' : 'pointer',
                                alignSelf: 'flex-start',
                              }}
                            >
                              {applyingId === insight.id ? 'Applying…' : 'Apply'}
                            </motion.button>
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Section 2: Promote ── */}
            {promoteInsights.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionHeader
                  label="Promote"
                  count={promoteInsights.length}
                  accentColor="#00DC82"
                  isOpen={promoteOpen}
                  onToggle={() => setPromoteOpen((v) => !v)}
                />
                <AnimatePresence initial={false}>
                  {promoteOpen && (
                    <motion.div
                      key="promote-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                        {promoteInsights.map((insight) => (
                          <Card
                            key={insight.id}
                            onClick={insight.recipe_id ? () => navigate(`/recipes/${insight.recipe_id}`) : undefined}
                          >
                            {recipeName(insight) ? (
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>
                                {recipeName(insight)}
                              </p>
                            ) : null}
                            <p
                              style={{
                                fontSize: 12,
                                color: '#1A1A1A',
                                margin: '0 0 8px',
                                lineHeight: 1.5,
                              }}
                            >
                              {insight.message}
                            </p>
                            {insight.recipe_id && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: '#7C3AED',
                                  fontWeight: 600,
                                }}
                              >
                                View dish →
                              </span>
                            )}
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Section 3: Consider removing ── */}
            {removeInsights.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionHeader
                  label="Consider removing"
                  count={removeInsights.length}
                  accentColor="#FF505F"
                  isOpen={removeOpen}
                  onToggle={() => setRemoveOpen((v) => !v)}
                />
                <AnimatePresence initial={false}>
                  {removeOpen && (
                    <motion.div
                      key="remove-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                        {removeInsights.map((insight) => (
                          <Card key={insight.id}>
                            {recipeName(insight) ? (
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>
                                {recipeName(insight)}
                              </p>
                            ) : null}
                            <p
                              style={{
                                fontSize: 12,
                                color: '#1A1A1A',
                                margin: '0 0 12px',
                                lineHeight: 1.5,
                              }}
                            >
                              {insight.message}
                            </p>
                            {insight.recipe_id && (
                              <motion.button
                                whileTap={{ scale: 0.96, opacity: 0.85 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                onClick={() => navigate(`/recipes/${insight.recipe_id}/edit`)}
                                style={{
                                  backgroundColor: 'transparent',
                                  color: '#FF505F',
                                  border: '0.5px solid rgba(255,80,95,0.3)',
                                  borderRadius: 8,
                                  padding: '8px 16px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  fontFamily: 'inherit',
                                  cursor: 'pointer',
                                  alignSelf: 'flex-start',
                                }}
                              >
                                Remove dish
                              </motion.button>
                            )}
                          </Card>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Refresh insights ── */}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.96, opacity: 0.85 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={handleRefresh}
                disabled={isRefreshing}
                style={{
                  backgroundColor: 'transparent',
                  color: '#7C3AED',
                  border: '0.5px solid #EDE8F5',
                  borderRadius: 9999,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isRefreshing ? 0.5 : 1,
                }}
              >
                <RotateCcw
                  size={13}
                  strokeWidth={1.5}
                  style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined}
                />
                {isRefreshing ? 'Refreshing…' : 'Refresh insights'}
              </motion.button>
            </div>

          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
