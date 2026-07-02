import { Sparkles } from 'lucide-react'
import GlacierHeader from '../components/ui/GlacierHeader'
import BottomNav from '../components/ui/BottomNav'

export default function AutopilotScreen() {
  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Autopilot" subtitle="Operations brief" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px', textAlign: 'center' }}>
        <Sparkles size={32} strokeWidth={1.5} color="#3FC6F0" style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FA', margin: '0 0 8px' }}>AI Operations Brief</p>
        <p style={{ fontSize: 13, color: '#9AA4B8', margin: 0, lineHeight: 1.5 }}>Daily insights and action items coming soon.</p>
      </div>
      <BottomNav />
    </div>
  )
}
