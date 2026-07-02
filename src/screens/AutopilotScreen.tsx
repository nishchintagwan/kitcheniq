import { Sparkles, Zap, Clock, TrendingUp } from 'lucide-react'
import BottomNav from '../components/ui/BottomNav'

const COMING_SOON = [
  { icon: Zap,        label: 'Daily operations brief', desc: 'What needs your attention today' },
  { icon: TrendingUp, label: 'Margin change alerts',   desc: 'Real-time ingredient cost impact' },
  { icon: Clock,      label: 'Reorder suggestions',    desc: 'Smart restocking recommendations' },
]

export default function AutopilotScreen() {
  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>

      {/* Full-bleed hero — covers the header area, edge-to-edge */}
      <div style={{ position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
        <img
          src="/ai-images/autopilot-feed.png"
          alt="Kitchen operations"
          style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 260 }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(12,17,27,0.55) 0%, transparent 40%, transparent 50%, rgba(12,17,27,0.92) 100%)',
        }} />
        {/* Page title — top left */}
        <div style={{ position: 'absolute', top: 16, left: 16 }}>
          <p style={{ fontSize: 21, fontWeight: 800, color: '#F4F6FA', margin: 0, letterSpacing: '-0.4px' }}>Autopilot</p>
          <p style={{ fontSize: 11, color: 'rgba(244,246,250,0.6)', margin: '2px 0 0' }}>Operations brief</p>
        </div>
        {/* AI badge + tagline — bottom left */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Sparkles size={14} strokeWidth={1.5} color="#3FC6F0" />
            <span style={{ fontSize: 9, color: '#3FC6F0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              AI Autopilot
            </span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#F4F6FA', margin: 0, letterSpacing: '-0.3px' }}>
            Your kitchen,<br />on autopilot.
          </p>
        </div>
      </div>

      <div style={{ padding: '0 16px 96px' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#6B7588', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
          Coming soon
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {COMING_SOON.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{
              backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14, opacity: 0.7,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                backgroundColor: 'rgba(63,198,240,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={18} strokeWidth={1.5} color="#3FC6F0" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#F4F6FA', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
