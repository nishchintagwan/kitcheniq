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
        gap: 6,
        width: fullWidth ? '100%' : 'auto',
        padding: '10px 16px',
        borderRadius: 10,
        border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.14)',
        backgroundColor: isPrimary ? '#3FC6F0' : 'rgba(255,255,255,0.06)',
        color: isPrimary ? '#04212E' : '#F4F6FA',
        fontSize: 11,
        fontWeight: 700,
        boxShadow: isPrimary ? '0 4px 16px rgba(63,198,240,0.25)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        letterSpacing: '0.01em',
        ...styleProp,
      }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
