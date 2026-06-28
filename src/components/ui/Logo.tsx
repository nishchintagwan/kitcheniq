interface LogoProps {
  size?: number
}

export default function Logo({ size = 22 }: LogoProps) {
  const radius = Math.round(size * 0.24)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: '#7C3AED',
        boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M5 20 L12 4 L19 20 M8 13.5 L16 13.5"
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
