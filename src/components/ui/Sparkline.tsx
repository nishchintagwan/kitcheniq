interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: string
}

export default function Sparkline({
  data,
  color = '#3FC6F0',
  height = 46,
  width = '100%',
}: SparklineProps) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const W = 300
  const H = height
  const pad = 4

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + (1 - (v - min) / range) * (H - pad * 2),
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath =
    `M${pts[0].x},${H} ` +
    pts.map((p) => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length - 1].x},${H} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width, height, display: 'block' }}
    >
      <path d={areaPath} fill={color} fillOpacity={0.12} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
