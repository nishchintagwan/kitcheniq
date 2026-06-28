interface SkeletonProps {
  width?: string | number
  height?: number
  radius?: number
}

export default function Skeleton({ width = '100%', height = 48, radius = 10 }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #F0EBF8 25%, #E8E0F5 50%, #F0EBF8 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  )
}
