# KitchenIQ — Full Design Implementation Prompt
# Paste this into Claude Code to implement the complete design system

You are building KitchenIQ from scratch. Nothing exists yet. Follow every instruction exactly.

## Step 1 — Install dependencies

```bash
npm install framer-motion
```

## Step 2 — Global CSS (src/index.css)

Replace entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@keyframes breathe {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
@keyframes drift1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(5px, -7px); }
}
@keyframes drift2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-4px, 5px); }
}
@keyframes drift3 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(7px, 4px); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

* { -webkit-tap-highlight-color: transparent; }

body {
  background-color: #FFFAF5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  max-width: 430px;
  margin: 0 auto;
}
```

## Step 3 — Tailwind config (tailwind.config.ts)

Replace colors section with:

```ts
colors: {
  brand: { action: '#7C3AED', 'action-shadow': 'rgba(124,58,237,0.3)' },
  bg: { base: '#FFFAF5', card: '#FFFFFF', header: '#0D0A14' },
  border: { DEFAULT: '#EDE8F5', track: '#F5F0FA' },
  text: {
    primary: '#1A1A1A', 'on-dark': '#FFFFFF',
    secondary: '#888888', muted: 'rgba(255,255,255,0.36)',
    inactive: '#BBBBBB',
  },
  healthy: {
    DEFAULT: '#00DC82', card: '#003D20',
    badge: '#F0FBF5', 'badge-text': '#00A36C',
  },
  watch: {
    DEFAULT: '#FBB924', card: '#3D2000',
    badge: '#FFF8EC', 'badge-text': '#F59E0B',
  },
  critical: {
    DEFAULT: '#FF505F', card: '#3D0008',
    badge: '#FFF5F6', 'badge-text': '#FF505F',
  },
  ai: { bg: '#F5F0FA', text: '#5B21B6', icon: '#7C3AED' },
}
```

## Step 4 — DarkHeader component (src/components/ui/DarkHeader.tsx)

Every screen must use this component. It includes the full atmospheric glow and spice particle animation.

```tsx
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface DarkHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  breadcrumb?: string
  rightElement?: React.ReactNode
  children?: React.ReactNode
}

export function DarkHeader({ title, subtitle, showBack, breadcrumb, rightElement, children }: DarkHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="bg-[#0D0A14] px-4 pt-4 pb-5 relative overflow-hidden">
      {/* Primary saffron glow top-right */}
      <div style={{
        position: 'absolute', top: -50, right: -40,
        width: 220, height: 220, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,99,10,0.28) 0%, rgba(232,99,10,0.10) 40%, transparent 70%)',
        animation: 'breathe 4s ease-in-out infinite', pointerEvents: 'none',
      }} />
      {/* Secondary saffron halo */}
      <div style={{
        position: 'absolute', top: -20, right: -10,
        width: 120, height: 120, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,166,35,0.14) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Purple counter-glow bottom-left */}
      <div style={{
        position: 'absolute', bottom: -20, left: -10,
        width: 100, height: 100, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Spice particle dots */}
      <div style={{ position: 'absolute', top: 10, right: 26, width: 2.5, height: 2.5, borderRadius: '50%', background: '#F5A623', opacity: 0.9, animation: 'drift1 4s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 22, right: 13, width: 2, height: 2, borderRadius: '50%', background: '#E8630A', opacity: 0.7, animation: 'drift2 5s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 7, right: 50, width: 2, height: 2, borderRadius: '50%', background: '#F5A623', opacity: 0.55, animation: 'drift3 6s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 12, right: 36, width: 2, height: 2, borderRadius: '50%', background: '#F5A623', opacity: 0.4, animation: 'drift1 7s ease-in-out infinite', pointerEvents: 'none' }} />

      {/* Content */}
      <div className="relative">
        {(showBack || breadcrumb || rightElement) && (
          <div className="flex items-center justify-between mb-2">
            {showBack ? (
              <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/40">
                <ArrowLeft size={14} strokeWidth={1.5} />
                {breadcrumb && <span className="text-[9px]">{breadcrumb}</span>}
              </button>
            ) : <div />}
            {rightElement}
          </div>
        )}
        <h1 className="text-white text-[15px] font-semibold tracking-tight leading-snug">{title}</h1>
        {subtitle && <p className="text-white/36 text-[9px] mt-0.5">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
```

## Step 5 — Primary Button (src/components/ui/Button.tsx)

```tsx
import { ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  fullWidth?: boolean
}

export function Button({ variant = 'primary', fullWidth, className = '', children, ...props }: ButtonProps) {
  const base = 'font-bold text-[11px] px-4 py-2.5 rounded-[10px] transition-opacity disabled:opacity-50'
  const variants = {
    primary: 'bg-[#7C3AED] text-white',
    ghost: 'border border-[#EDE8F5] text-[#1A1A1A] bg-transparent',
  }
  return (
    <motion.button
      whileTap={{ scale: 0.96, opacity: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={variant === 'primary' ? { boxShadow: '0 4px 16px rgba(124,58,237,0.3)' } : undefined}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  )
}
```

## Step 6 — Tinted stat cards (src/components/ui/StatCard.tsx)

```tsx
type Status = 'healthy' | 'watch' | 'critical'

const config = {
  healthy: { bg: '#003D20', number: '#00DC82', border: 'rgba(0,220,130,0.4)', label: 'Healthy' },
  watch:   { bg: '#3D2000', number: '#FBB924', border: 'rgba(251,185,36,0.4)',  label: 'Watch'   },
  critical:{ bg: '#3D0008', number: '#FF505F', border: 'rgba(255,80,95,0.4)',   label: 'Critical'},
}

export function StatCard({ status, value }: { status: Status; value: number }) {
  const { bg, number, border, label } = config[status]
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '7px 6px', border: `0.5px solid ${border}` }}>
      <p style={{ margin: '0 0 3px', color: number, opacity: 0.55, fontSize: 6, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, color: number, fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</p>
    </div>
  )
}
```

## Step 7 — Page transitions (src/App.tsx)

Wrap all routes in AnimatePresence with spring transitions:

```tsx
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

// Track navigation direction
const locationIndexRef = { current: 0 }

function AnimatedRoutes() {
  const location = useLocation()
  // Use in Routes wrapper with AnimatePresence mode="popstate"
  return (
    <AnimatePresence mode="popstate">
      <motion.div
        key={location.pathname}
        initial={{ x: '100%', opacity: 1 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
        style={{ position: 'fixed', inset: 0, overflow: 'auto', background: '#FFFAF5' }}
      >
        {/* Routes go here */}
      </motion.div>
    </AnimatePresence>
  )
}
```

## Step 8 — Card component (src/components/ui/Card.tsx)

```tsx
import { motion } from 'framer-motion'
import { HTMLAttributes } from 'react'

export function Card({ className = '', children, onClick, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.97, opacity: 0.85 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onClick}
      className={`bg-white rounded-[14px] border border-[#EDE8F5] p-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.div>
  )
}
```

## Step 9 — Margin bar (src/components/ui/MarginBar.tsx)

```tsx
export function MarginBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  const color = clamped >= 50 ? '#00DC82' : clamped >= 30 ? '#FBB924' : '#FF505F'
  return (
    <div style={{ width: '100%', height: 3, background: '#F5F0FA', borderRadius: 999 }}>
      <div style={{ width: `${clamped}%`, height: 3, background: color, borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
    </div>
  )
}
```

## Step 10 — Skeleton loader (src/components/ui/Skeleton.tsx)

```tsx
export function Skeleton({ width = '100%', height = 48, radius = 10 }: { width?: string | number; height?: number; radius?: number }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #F0EBF8 25%, #E8E0F5 50%, #F0EBF8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  )
}
```

## Step 11 — Logo mark (use everywhere)

```tsx
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.24), background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 52 52" fill="none">
        <path d="M10 42 L26 10 L42 42" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 30 L35 30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="26" cy="10" r="3" fill="white"/>
      </svg>
    </div>
  )
}
```

## Step 12 — Bottom navigation (src/components/ui/BottomNav.tsx)

Active colour: #7C3AED. Inactive: #BBBBBB. White background. 0.5px border-top #EDE8F5.

All icons: Lucide React, strokeWidth 1.5, size 18.

Tabs: Home (/dashboard), Recipes (/recipes), Nutrition (/recipes/:id/nutrition), Insights (/insights), Settings (/settings)

---

## Critical rules — read before generating any screen

1. EVERY screen has a DarkHeader component with the full glow and particles
2. EVERY button is #7C3AED with white text and purple shadow
3. EVERY icon has strokeWidth={1.5}
4. EVERY card has whileTap spring animation
5. EVERY page transition uses Framer Motion spring
6. The stat blocks on dashboard use the tinted card system — not plain coloured numbers
7. Margin bars are 3px height, empty track #F5F0FA
8. App background is always #FFFAF5
9. Card background is always #FFFFFF with border #EDE8F5
10. Never hardcode margins/costs — always calculate live from Supabase data

