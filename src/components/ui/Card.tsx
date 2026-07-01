import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  onClick?: () => void
  elevated?: boolean
  className?: string
  children?: ReactNode
}

export default function Card({ onClick, elevated = false, className, children, style: styleProp, ...rest }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97, opacity: 0.85 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={className}
      style={{
        backgroundColor: elevated ? '#1B2436' : '#161D2B',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: 16,
        cursor: onClick ? 'pointer' : 'default',
        ...styleProp,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
