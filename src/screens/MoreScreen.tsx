import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings, Sparkles, ChevronRight } from 'lucide-react'
import GlacierHeader from '../components/ui/GlacierHeader'
import BottomNav from '../components/ui/BottomNav'

const MENU_ITEMS = [
  { label: 'AI Insights',      sub: 'Reprice, promote, remove suggestions', icon: <Sparkles size={18} strokeWidth={1.5} color="#3FC6F0" />, path: '/insights' },
  { label: 'Settings',         sub: 'Restaurant info, exports, account',     icon: <Settings  size={18} strokeWidth={1.5} color="#9AA4B8" />, path: '/settings' },
]

export default function MoreScreen() {
  const navigate = useNavigate()
  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="More" />
      <div style={{ padding: '16px 16px 96px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MENU_ITEMS.map(({ label, sub, icon, path }) => (
          <motion.div
            key={path}
            whileTap={{ scale: 0.98, opacity: 0.85 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => navigate(path)}
            style={{ backgroundColor: '#161D2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#1B2436', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F4F6FA', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 11, color: '#9AA4B8', margin: 0 }}>{sub}</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.5} color="#6B7588" />
          </motion.div>
        ))}
      </div>
      <BottomNav />
    </div>
  )
}
