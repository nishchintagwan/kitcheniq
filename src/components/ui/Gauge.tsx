import { motion } from 'framer-motion'

interface GaugeProps {
  value: number
  size?: number
  label?: string
  sublabel?: string
}

export default function Gauge({ value, size = 190, label, sublabel }: GaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) - 14
  const circumference = 2 * Math.PI * r
  // 270° sweep = 75% of circle. Starts at 135° (bottom-left) via transform.
  const fullOffset = circumference
  const targetOffset = circumference * (1 - (Math.min(100, Math.max(0, value)) / 100) * 0.75)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={13}
        strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />

      {/* Fill arc */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#3FC6F0"
        strokeWidth={13}
        strokeLinecap="round"
        strokeDasharray={String(circumference)}
        transform={`rotate(135 ${cx} ${cy})`}
        initial={{ strokeDashoffset: fullOffset }}
        animate={{ strokeDashoffset: targetOffset }}
        transition={{ type: 'spring', stiffness: 60, damping: 20 }}
      />

      {/* Center label */}
      {label && (
        <text
          x={cx}
          y={cy - 18}
          textAnchor="middle"
          fontSize={9}
          fontWeight={800}
          fill="#9AA4B8"
          fontFamily="Inter, sans-serif"
          letterSpacing="0.06em"
          style={{ textTransform: 'uppercase' }}
        >
          {label}
        </text>
      )}

      {/* Center value */}
      <text
        x={cx}
        y={cy + 8}
        textAnchor="middle"
        fontSize={34}
        fontWeight={800}
        fill="#F4F6FA"
        fontFamily="Inter, sans-serif"
        letterSpacing="-0.5px"
      >
        {Math.round(value)}%
      </text>

      {/* Sublabel */}
      {sublabel && (
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#36D399"
          fontFamily="Inter, sans-serif"
        >
          {sublabel}
        </text>
      )}
    </svg>
  )
}
