import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { useIngredientStore } from '../stores/ingredientStore'
import { getSpikeInsights, dismissSpikeInsights } from '../lib/queries'
import { getMarginStatus, formatCurrency } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
import StatusBadge from '../components/ui/StatusBadge'
import Skeleton from '../components/ui/Skeleton'
import BottomNav from '../components/ui/BottomNav'
import type { AiInsight, Unit } from '../types'

function displayUnit(unit: Unit): string {
  if (unit === 'gram') return 'kg'
  if (unit === 'ml') return 'litre'
  return unit
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

const STATUS_COLOR: Record<string, string> = { healthy: '#36D399', watch: '#F0A93F', critical: '#F0596B' }

export default function AlertDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { spikes, dismissSpike } = useIngredientStore()

  const [insights, setInsights] = useState<AiInsight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [isDismissing, setIsDismissing] = useState(false)

  const spike = spikes.find((s) => s.ingredient.id === id)

  useEffect(() => {
    if (!id) return
    getSpikeInsights(id).then((data) => { setInsights(data); setInsightsLoading(false) })
  }, [id])

  async function handleDismiss() {
    if (!id) return
    setIsDismissing(true)
    await dismissSpikeInsights(id)
    dismissSpike(id)
    navigate(-1)
  }

  if (!spike) {
    return (
      <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
        <GlacierHeader title="Price alert" showBack breadcrumb="Alerts" />
        <div style={{ padding: '48px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#9AA4B8', margin: 0 }}>This alert is no longer active.</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const { ingredient, previousPrice, newPrice, changePercent, affectedRecipes } = spike
  const unit = displayUnit(ingredient.unit)
  const sign = changePercent > 0 ? '+' : ''
  const pct = `${sign}${Math.round(changePercent)}%`

  const criticalCount = affectedRecipes.filter((r) => getMarginStatus(r.newMargin) === 'critical').length
  const summaryText = affectedRecipes.length === 0
    ? 'No dishes affected'
    : `${affectedRecipes.length} dish${affectedRecipes.length !== 1 ? 'es' : ''} affected` +
      (criticalCount > 0 ? ` — ${criticalCount} now critical` : '')

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Price alert" subtitle={`${ingredient.name}: ${pct}`} showBack breadcrumb="Alerts" />

      <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Alert hero card */}
        <div style={{ backgroundColor: 'rgba(240,169,63,0.14)', border: '1px solid rgba(240,169,63,0.3)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} strokeWidth={1.5} color="#F0A93F" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FA' }}>{ingredient.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#9AA4B8' }}>₹{previousPrice}/{unit}</span>
            <ArrowRight size={16} strokeWidth={1.5} color="#6B7588" />
            <span style={{ fontSize: 20, fontWeight: 700, color: changePercent > 0 ? '#F0596B' : '#36D399' }}>
              ₹{newPrice}/{unit}
            </span>
            <span style={{
              fontSize: 13, fontWeight: 700, color: changePercent > 0 ? '#F0596B' : '#36D399',
              backgroundColor: changePercent > 0 ? 'rgba(240,89,107,0.15)' : 'rgba(54,211,153,0.15)',
              borderRadius: 9999, padding: '2px 8px',
            }}>
              {pct}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0 }}>{relativeTime(new Date().toISOString())}</p>
        </div>

        <p style={{ fontSize: 12, color: '#9AA4B8', margin: 0 }}>{summaryText}</p>

        {/* Affected dishes */}
        {affectedRecipes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {affectedRecipes.map(({ recipe, oldMargin, newMargin }) => {
              const oldStatus = getMarginStatus(oldMargin)
              const newStatus = getMarginStatus(newMargin)
              const recommendation = insights.find((ins) => ins.recipe_id === recipe.id)
              return (
                <div key={recipe.id} style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#F4F6FA', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {recipe.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <StatusBadge status={oldStatus} />
                    <ArrowRight size={12} strokeWidth={1.5} color="#6B7588" />
                    <StatusBadge status={newStatus} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#9AA4B8' }}>{oldMargin.toFixed(1)}%</span>
                    <ArrowRight size={12} strokeWidth={1.5} color="#6B7588" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[newStatus] ?? '#9AA4B8' }}>
                      {newMargin.toFixed(1)}%
                    </span>
                    <span style={{ fontSize: 11, color: '#9AA4B8' }}>({formatCurrency(recipe.selling_price)})</span>
                  </div>

                  {insightsLoading ? (
                    <Skeleton height={32} radius={6} />
                  ) : recommendation ? (
                    <p style={{ fontSize: 12, color: '#9AA4B8', fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5, borderLeft: '2px solid rgba(63,198,240,0.3)', paddingLeft: 10 }}>
                      {recommendation.message}
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button
                      whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      onClick={() => navigate(`/ingredients/${ingredient.id}`)}
                      style={{ flex: 1, backgroundColor: '#3FC6F0', color: '#04212E', border: 'none', borderRadius: 10, padding: '9px 0', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 16px rgba(63,198,240,0.25)' }}
                    >
                      Update price
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      onClick={() => navigate(`/recipes/${recipe.id}`)}
                      style={{ flex: 1, backgroundColor: 'transparent', color: '#3FC6F0', border: '1px solid rgba(63,198,240,0.3)', borderRadius: 10, padding: '9px 0', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      View dish
                    </motion.button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.96, opacity: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={handleDismiss} disabled={isDismissing}
          style={{ width: '100%', backgroundColor: 'transparent', color: isDismissing ? '#6B7588' : '#9AA4B8', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '12px 0', fontSize: 13, fontFamily: 'inherit', cursor: isDismissing ? 'not-allowed' : 'pointer', marginTop: 4 }}
        >
          {isDismissing ? 'Dismissing…' : 'Dismiss alert'}
        </motion.button>

      </div>

      <BottomNav />
    </div>
  )
}
