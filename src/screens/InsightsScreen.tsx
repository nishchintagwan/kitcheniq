import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import { useRecipeStore } from '../stores/recipeStore'
import { getMenuInsights, dismissInsight, applyReprice } from '../lib/queries'
import GlacierHeader from '../components/ui/GlacierHeader'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import type { AiInsight } from '../types'

const PANEL: React.CSSProperties = {
  backgroundColor: '#161D2B',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: 14,
}

interface SectionHeaderProps {
  label: string; count: number; accentColor: string; isOpen: boolean; onToggle: () => void
}

function SectionHeader({ label, count, accentColor, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onToggle}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', fontFamily: 'inherit' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F4F6FA' }}>{label}</span>
        {count > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, backgroundColor: `${accentColor}22`, borderRadius: 9999, padding: '2px 7px', lineHeight: 1.6 }}>
            {count}
          </span>
        )}
      </div>
      {isOpen ? <ChevronUp size={14} strokeWidth={1.5} color="#6B7588" /> : <ChevronDown size={14} strokeWidth={1.5} color="#6B7588" />}
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
    } finally { setApplyingId(null) }
  }

  async function handleRefresh() {
    if (!restaurant?.id) return
    setIsRefreshing(true)
    try {
      await supabase.functions.invoke('ai-menu-optimisation', { body: { restaurantId: restaurant.id } })
    } catch { /* silent */ }
    await loadInsights(restaurant.id)
    setIsRefreshing(false)
  }

  function recipeName(insight: AiInsight): string {
    if (!insight.recipe_id) return ''
    return recipes.find((r) => r.id === insight.recipe_id)?.name ?? ''
  }

  function InsightCard({ insight, accentColor, actionLabel, onAction, showViewLink }: {
    insight: AiInsight; accentColor: string; actionLabel?: string; onAction?: () => void; showViewLink?: boolean
  }) {
    return (
      <div style={{ ...PANEL, borderLeft: `2px solid ${accentColor}` }}>
        {recipeName(insight) ? (
          <p style={{ fontSize: 13, fontWeight: 700, color: '#F4F6FA', margin: '0 0 4px' }}>{recipeName(insight)}</p>
        ) : null}
        <p style={{ fontSize: 12, color: '#9AA4B8', margin: showViewLink || onAction ? '0 0 12px' : 0, lineHeight: 1.5 }}>
          {insight.message}
        </p>
        {onAction && (
          <motion.button
            whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={onAction} disabled={applyingId === insight.id}
            style={{
              backgroundColor: 'transparent', color: applyingId === insight.id ? '#6B7588' : accentColor,
              border: `1px solid ${accentColor}44`, borderRadius: 8, padding: '7px 14px', fontSize: 12,
              fontWeight: 600, fontFamily: 'inherit', cursor: applyingId === insight.id ? 'not-allowed' : 'pointer',
            }}
          >
            {applyingId === insight.id ? 'Applying…' : actionLabel}
          </motion.button>
        )}
        {showViewLink && insight.recipe_id && (
          <button
            onClick={() => navigate(`/recipes/${insight.recipe_id}`)}
            style={{ background: 'none', border: 'none', color: '#3FC6F0', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}
          >
            View dish →
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="AI Insights" subtitle="Updated weekly" />

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px', textAlign: 'center' }}>
            <Sparkles size={32} strokeWidth={1.5} color="#3FC6F0" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FA', margin: '0 0 8px' }}>No urgent actions right now</p>
            <p style={{ fontSize: 13, color: '#9AA4B8', margin: '0 0 24px', lineHeight: 1.5 }}>
              Your menu is healthy. Tap refresh to get the latest analysis.
            </p>
            <motion.button
              whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={handleRefresh} disabled={isRefreshing}
              style={{
                backgroundColor: 'transparent', color: '#3FC6F0', border: '1px solid rgba(63,198,240,0.3)',
                borderRadius: 9999, padding: '10px 20px', fontSize: 13, fontFamily: 'inherit',
                cursor: isRefreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: isRefreshing ? 0.5 : 1,
              }}
            >
              <RotateCcw size={13} strokeWidth={1.5} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
              {isRefreshing ? 'Refreshing…' : 'Refresh insights'}
            </motion.button>
          </div>

        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

            {repriceInsights.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionHeader label="Reprice" count={repriceInsights.length} accentColor="#F0A93F" isOpen={repriceOpen} onToggle={() => setRepriceOpen((v) => !v)} />
                <AnimatePresence initial={false}>
                  {repriceOpen && (
                    <motion.div key="reprice" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                        {repriceInsights.map((i) => (
                          <InsightCard key={i.id} insight={i} accentColor="#F0A93F" actionLabel="Apply" onAction={() => handleApply(i)} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {promoteInsights.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionHeader label="Promote" count={promoteInsights.length} accentColor="#36D399" isOpen={promoteOpen} onToggle={() => setPromoteOpen((v) => !v)} />
                <AnimatePresence initial={false}>
                  {promoteOpen && (
                    <motion.div key="promote" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                        {promoteInsights.map((i) => (
                          <InsightCard key={i.id} insight={i} accentColor="#36D399" showViewLink />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {removeInsights.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionHeader label="Consider removing" count={removeInsights.length} accentColor="#F0596B" isOpen={removeOpen} onToggle={() => setRemoveOpen((v) => !v)} />
                <AnimatePresence initial={false}>
                  {removeOpen && (
                    <motion.div key="remove" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
                        {removeInsights.map((i) => (
                          <InsightCard key={i.id} insight={i} accentColor="#F0596B"
                            actionLabel="Remove dish"
                            onAction={i.recipe_id ? () => navigate(`/recipes/${i.recipe_id}/edit`) : undefined}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <motion.button
                whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={handleRefresh} disabled={isRefreshing}
                style={{
                  backgroundColor: 'transparent', color: '#3FC6F0', border: '1px solid rgba(63,198,240,0.3)',
                  borderRadius: 9999, padding: '10px 20px', fontSize: 13, fontFamily: 'inherit',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: isRefreshing ? 0.5 : 1,
                }}
              >
                <RotateCcw size={13} strokeWidth={1.5} style={isRefreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
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
