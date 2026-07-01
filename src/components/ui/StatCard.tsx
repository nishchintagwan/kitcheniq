import type { MarginStatus } from '../../types'

interface StatCardProps {
  status: MarginStatus
  value: number
}

const config: Record<MarginStatus, { bg: string; numberColor: string; border: string; label: string }> = {
  healthy:  { bg: 'rgba(54,211,153,0.14)',  numberColor: '#36D399', border: 'rgba(54,211,153,0.3)',   label: 'Healthy'  },
  watch:    { bg: 'rgba(240,169,63,0.14)',  numberColor: '#F0A93F', border: 'rgba(240,169,63,0.3)',  label: 'Watch'    },
  critical: { bg: 'rgba(240,89,107,0.14)', numberColor: '#F0596B', border: 'rgba(240,89,107,0.3)', label: 'Critical' },
}

export default function StatCard({ status, value }: StatCardProps) {
  const { bg, numberColor, border, label } = config[status]

  return (
    <div
      style={{
        backgroundColor: bg,
        borderRadius: 12,
        border: `1px solid ${border}`,
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
      }}
    >
      <div
        style={{
          color: numberColor,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: '#9AA4B8',
          fontSize: 7,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 800,
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  )
}
