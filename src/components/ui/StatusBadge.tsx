import type { MarginStatus } from '../../types'

interface StatusBadgeProps {
  status: MarginStatus
}

const config: Record<MarginStatus, { bg: string; color: string; label: string }> = {
  healthy:  { bg: '#F0FBF5', color: '#00A36C', label: 'Healthy'  },
  watch:    { bg: '#FFF8EC', color: '#F59E0B', label: 'Watch'    },
  critical: { bg: '#FFF5F6', color: '#FF505F', label: 'Critical' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, color, label } = config[status]

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: bg,
        color,
        fontSize: 9,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 9999,
      }}
    >
      {label}
    </span>
  )
}
