interface MarginBarProps {
  percent: number
  height?: number
}

export default function MarginBar({ percent, height = 4 }: MarginBarProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  const fillColor = clamped >= 50 ? '#36D399' : clamped >= 30 ? '#F0A93F' : '#F0596B'

  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 999,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          backgroundColor: fillColor,
          borderRadius: 999,
          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
    </div>
  )
}
