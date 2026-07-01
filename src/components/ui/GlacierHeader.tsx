import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface GlacierHeaderProps {
  title?: string
  subtitle?: string
  showBack?: boolean
  breadcrumb?: string
  leftElement?: ReactNode
  rightElement?: ReactNode
  children?: ReactNode
}

export default function GlacierHeader({
  title,
  subtitle,
  showBack,
  breadcrumb,
  leftElement,
  rightElement,
  children,
}: GlacierHeaderProps) {
  const navigate = useNavigate()

  return (
    <div
      style={{
        background: 'transparent',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 14,
        paddingBottom: 20,
      }}
    >
      {/* Top row: back/left + right */}
      {(showBack || rightElement != null || leftElement != null) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: title ? 8 : 0,
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
              <ArrowLeft size={16} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
              {breadcrumb && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>
                  {breadcrumb}
                </span>
              )}
            </button>
          ) : leftElement != null ? (
            leftElement
          ) : (
            <div />
          )}
          {rightElement != null && <div>{rightElement}</div>}
        </div>
      )}

      {title && (
        <div
          style={{
            color: '#F4F6FA',
            fontSize: 21,
            fontWeight: 800,
            letterSpacing: '-0.4px',
          }}
        >
          {title}
        </div>
      )}

      {subtitle != null && (
        <div
          style={{
            color: '#9AA4B8',
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      )}

      {children}
    </div>
  )
}
