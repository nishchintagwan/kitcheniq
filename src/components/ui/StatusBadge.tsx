import type { MarginStatus } from '../../types'

interface StatusBadgeProps {
  status: MarginStatus
}

const config: Record<MarginStatus, { bg: string; color: string; label: string }> = {
  healthy:  { bg: 'rgba(54,211,153,0.14)',  color: '#36D399', label: 'Healthy'  },
  watch:    { bg: 'rgba(240,169,63,0.14)',  color: '#F0A93F', label: 'Watch'    },
  critical: { bg: 'rgba(240,89,107,0.14)', color: '#F0596B', label: 'Critical' },
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
        fontWeight: 800,
        padding: '2px 8px',
        borderRadius: 9999,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
  )
}
