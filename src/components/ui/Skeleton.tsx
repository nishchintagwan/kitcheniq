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
        background: 'linear-gradient(90deg, #1B2436 25%, #243046 50%, #1B2436 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer-dark 1.5s infinite',
      }}
    />
  )
}
