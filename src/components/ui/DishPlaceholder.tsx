interface DishPlaceholderProps {
  name: string
  size?: number
  shape?: 'circle' | 'rounded'
}

const PALETTE: Array<{ bg: string; text: string }> = [
  { bg: 'rgba(63,198,240,0.20)',  text: '#3FC6F0' },
  { bg: 'rgba(54,211,153,0.20)',  text: '#36D399' },
  { bg: 'rgba(240,169,63,0.20)', text: '#F0A93F' },
  { bg: 'rgba(240,89,107,0.20)', text: '#F0596B' },
  { bg: 'rgba(167,139,250,0.20)',text: '#A78BFA' },
  { bg: 'rgba(251,146,60,0.20)', text: '#FB923C' },
]

function hashChar(c: string): number {
  return c.charCodeAt(0) % PALETTE.length
}

export default function DishPlaceholder({ name, size = 48, shape = 'circle' }: DishPlaceholderProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const { bg, text } = PALETTE[hashChar(initial)]
  const radius = shape === 'circle' ? size / 2 : size * 0.3

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: size * 0.4,
          fontWeight: 800,
          color: text,
          lineHeight: 1,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {initial}
      </span>
    </div>
  )
}
