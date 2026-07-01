import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, UtensilsCrossed, Zap, Bell, MoreHorizontal } from 'lucide-react'

const tabs = [
  { label: 'Dashboard', path: '/dashboard',  Icon: Home            },
  { label: 'Dishes',    path: '/recipes',    Icon: UtensilsCrossed  },
  { label: 'Autopilot', path: '/autopilot',  Icon: Zap              },
  { label: 'Alerts',    path: '/alerts',     Icon: Bell             },
  { label: 'More',      path: '/more',       Icon: MoreHorizontal   },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  function isActive(path: string) {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 28px)',
        maxWidth: 402,
        height: 66,
        background: 'rgba(20,26,38,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 9999,
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {tabs.map(({ label, path, Icon }) => {
        const active = isActive(path)
        const color = active ? '#3FC6F0' : '#6B7588'

        return (
          <motion.button
            key={path}
            onClick={() => navigate(path)}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color,
            }}
          >
            <Icon size={18} strokeWidth={1.5} color={color} />
            <span style={{ fontSize: 8, color, fontWeight: active ? 800 : 400, letterSpacing: '0.01em' }}>
              {label}
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}
