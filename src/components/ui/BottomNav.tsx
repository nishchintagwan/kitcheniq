import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, UtensilsCrossed, Package, Lightbulb, Settings } from 'lucide-react'

const tabs = [
  { label: 'Home',        path: '/dashboard',   Icon: Home           },
  { label: 'Recipes',     path: '/recipes',      Icon: UtensilsCrossed },
  { label: 'Ingredients', path: '/ingredients',  Icon: Package         },
  { label: 'Insights',    path: '/insights',     Icon: Lightbulb       },
  { label: 'Settings',    path: '/settings',     Icon: Settings        },
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
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        backgroundColor: '#FFFFFF',
        borderTop: '0.5px solid #EDE8F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 50,
      }}
    >
      {tabs.map(({ label, path, Icon }) => {
        const active = isActive(path)
        const color = active ? '#7C3AED' : '#BBBBBB'

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
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color,
            }}
          >
            <Icon size={18} strokeWidth={1.5} color={color} />
            <span style={{ fontSize: 9, color, fontWeight: active ? 600 : 400 }}>
              {label}
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}
