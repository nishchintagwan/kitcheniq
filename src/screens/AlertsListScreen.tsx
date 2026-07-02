import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, BellOff } from 'lucide-react'
import { useIngredientStore } from '../stores/ingredientStore'
import { getMarginStatus } from '../lib/costCalculator'
import GlacierHeader from '../components/ui/GlacierHeader'
import BottomNav from '../components/ui/BottomNav'
import type { PriceSpike, Unit } from '../types'

function displayUnit(unit: Unit): string {
  if (unit === 'gram') return 'kg'
  if (unit === 'ml') return 'litre'
  return unit
}

export default function AlertsListScreen() {
  const navigate = useNavigate()
  const { spikes } = useIngredientStore()

  const criticalSpikes = spikes.filter((s) =>
    s.affectedRecipes.some((r) => getMarginStatus(r.newMargin) === 'critical')
  )
  const otherSpikes = spikes.filter(
    (s) => !s.affectedRecipes.some((r) => getMarginStatus(r.newMargin) === 'critical')
  )

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Alerts" subtitle={spikes.length > 0 ? `${spikes.length} active` : undefined} />

      <div style={{ padding: '16px 16px 96px' }}>
        {spikes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px', textAlign: 'center' }}>
            <BellOff size={32} strokeWidth={1.5} color="#6B7588" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FA', margin: '0 0 8px' }}>No active alerts</p>
            <p style={{ fontSize: 13, color: '#9AA4B8', margin: 0, lineHeight: 1.5 }}>
              Price spikes appear here when ingredient costs change significantly.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {criticalSpikes.length > 0 && (
              <>
                <p style={{ fontSize: 9, fontWeight: 800, color: '#F0596B', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                  Critical — action needed
                </p>
                {criticalSpikes.map((spike) => (
                  <AlertRow key={spike.ingredient.id} spike={spike} onTap={() => navigate(`/alerts/${spike.ingredient.id}`)} />
                ))}
              </>
            )}
            {otherSpikes.length > 0 && (
              <>
                {criticalSpikes.length > 0 && (
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#F0A93F', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 4px' }}>
                    Watch
                  </p>
                )}
                {otherSpikes.map((spike) => (
                  <AlertRow key={spike.ingredient.id} spike={spike} onTap={() => navigate(`/alerts/${spike.ingredient.id}`)} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function AlertRow({ spike, onTap }: { spike: PriceSpike; onTap: () => void }) {
  const isCritical = spike.affectedRecipes.some((r) => getMarginStatus(r.newMargin) === 'critical')
  const accentColor = isCritical ? '#F0596B' : '#F0A93F'
  const unit = displayUnit(spike.ingredient.unit)
  const sign = spike.changePercent > 0 ? '+' : ''

  return (
    <motion.div
      whileTap={{ scale: 0.98, opacity: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onTap}
      style={{
        backgroundColor: '#161D2B', border: `1px solid ${accentColor}33`,
        borderLeft: `3px solid ${accentColor}`, borderRadius: 14,
        padding: '12px 14px', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} strokeWidth={1.5} color={accentColor} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F4F6FA' }}>{spike.ingredient.name}</span>
        </div>
        <ArrowRight size={14} strokeWidth={1.5} color="#6B7588" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#9AA4B8' }}>₹{spike.previousPrice}/{unit}</span>
        <ArrowRight size={11} strokeWidth={1.5} color="#6B7588" />
        <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>₹{spike.newPrice}/{unit}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, backgroundColor: `${accentColor}22`, borderRadius: 9999, padding: '1px 6px' }}>
          {sign}{Math.round(spike.changePercent)}%
        </span>
      </div>
      {spike.affectedRecipes.length > 0 && (
        <p style={{ fontSize: 11, color: '#9AA4B8', margin: '6px 0 0' }}>
          {spike.affectedRecipes.length} dish{spike.affectedRecipes.length !== 1 ? 'es' : ''} affected
        </p>
      )}
    </motion.div>
  )
}
