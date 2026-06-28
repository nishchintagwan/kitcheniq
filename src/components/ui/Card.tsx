import { motion } from 'framer-motion'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  onClick?: () => void
  className?: string
  children?: ReactNode
}

export default function Card({ onClick, className, children, style: styleProp, ...rest }: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.97, opacity: 0.85 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={className}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: '0.5px solid #EDE8F5',
        padding: 12,
        cursor: onClick ? 'pointer' : 'default',
        ...styleProp,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
