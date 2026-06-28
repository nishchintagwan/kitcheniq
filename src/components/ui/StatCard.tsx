import type { MarginStatus } from '../../types'

interface StatCardProps {
  status: MarginStatus
  value: number
}

const config: Record<MarginStatus, { bg: string; numberColor: string; border: string; label: string }> = {
  healthy:  { bg: '#003D20', numberColor: '#00DC82', border: 'rgba(0,220,130,0.4)',   label: 'Healthy'  },
  watch:    { bg: '#3D2000', numberColor: '#FBB924', border: 'rgba(251,185,36,0.4)',  label: 'Watch'    },
  critical: { bg: '#3D0008', numberColor: '#FF505F', border: 'rgba(255,80,95,0.4)',   label: 'Critical' },
}

export default function StatCard({ status, value }: StatCardProps) {
  const { bg, numberColor, border, label } = config[status]

  return (
    <div
      style={{
        backgroundColor: bg,
        borderRadius: 8,
        border: `0.5px solid ${border}`,
        padding: '7px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
      }}
    >
      <div
        style={{
          color: numberColor,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: '-0.5px',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: numberColor,
          fontSize: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.55,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  )
}
