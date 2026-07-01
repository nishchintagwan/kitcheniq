import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'ghost'
  fullWidth?: boolean
  children?: ReactNode
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  disabled,
  children,
  style: styleProp,
  ...rest
}: ButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96, opacity: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        padding: '10px 16px',
        borderRadius: 10,
        border: isPrimary ? 'none' : '0.5px solid #EDE8F5',
        backgroundColor: isPrimary ? '#7C3AED' : 'transparent',
        color: isPrimary ? '#FFFFFF' : '#1A1A1A',
        fontSize: 11,
        fontWeight: isPrimary ? 700 : 500,
        boxShadow: isPrimary ? '0 4px 16px rgba(124,58,237,0.3)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        ...styleProp,
      }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
