import { BarChart2 } from 'lucide-react'
import GlacierHeader from '../components/ui/GlacierHeader'
import BottomNav from '../components/ui/BottomNav'

export default function IntelligenceHubScreen() {
  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Intelligence Hub" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '72px 24px', textAlign: 'center' }}>
        <BarChart2 size={32} strokeWidth={1.5} color="#3FC6F0" style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: '#F4F6FA', margin: '0 0 8px' }}>Intelligence Hub</p>
        <p style={{ fontSize: 13, color: '#9AA4B8', margin: 0, lineHeight: 1.5 }}>Advanced analytics and insights coming soon.</p>
      </div>
      <BottomNav />
    </div>
  )
}
