import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface DarkHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  breadcrumb?: string
  rightElement?: ReactNode
  children?: ReactNode
}

export default function DarkHeader({
  title,
  subtitle,
  showBack,
  breadcrumb,
  rightElement,
  children,
}: DarkHeaderProps) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        backgroundColor: '#0D0A14',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 16,
        paddingBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Primary saffron glow */}
      <div
        style={{
          position: 'absolute',
          top: -50,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(232,99,10,0.28), rgba(232,99,10,0.10), transparent)',
          animation: 'breathe 4s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Secondary saffron halo */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -10,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.14), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Purple counter-glow */}
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          left: -10,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.10), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Spice dot 1 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 26,
          width: 2.5,
          height: 2.5,
          borderRadius: '50%',
          backgroundColor: '#F5A623',
          opacity: 0.9,
          animation: 'drift1 4s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Spice dot 2 */}
      <div
        style={{
          position: 'absolute',
          top: 22,
          right: 13,
          width: 2,
          height: 2,
          borderRadius: '50%',
          backgroundColor: '#E8630A',
          opacity: 0.7,
          animation: 'drift2 5s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Spice dot 3 */}
      <div
        style={{
          position: 'absolute',
          top: 7,
          right: 50,
          width: 2,
          height: 2,
          borderRadius: '50%',
          backgroundColor: '#F5A623',
          opacity: 0.55,
          animation: 'drift3 6s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Spice dot 4 */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 36,
          width: 2,
          height: 2,
          borderRadius: '50%',
          backgroundColor: '#F5A623',
          opacity: 0.4,
          animation: 'drift1 7s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Content layer — sits above glows */}
      <div style={{ position: 'relative' }}>
        {/* Top row: back button (left) + rightElement (right) */}
        {(showBack || rightElement) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            {showBack ? (
              <button
                onClick={() => navigate(-1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={14} strokeWidth={1.5} color="rgba(255,255,255,0.40)" />
                {breadcrumb && (
                  <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 9 }}>
                    {breadcrumb}
                  </span>
                )}
              </button>
            ) : (
              <div />
            )}
            {rightElement != null && <div>{rightElement}</div>}
          </div>
        )}

        {/* Title */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </div>

        {/* Subtitle — only rendered when passed, no gap otherwise */}
        {subtitle != null && (
          <div
            style={{
              color: 'rgba(255,255,255,0.36)',
              fontSize: 9,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}

        {/* Children — rendered below subtitle */}
        {children}
      </div>
    </div>
  )
}
