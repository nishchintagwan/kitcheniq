import { Sparkles } from 'lucide-react'
import Skeleton from './Skeleton'

interface AiTipCardProps {
  tip?: string | null
  isLoading: boolean
}

export default function AiTipCard({ tip, isLoading }: AiTipCardProps) {
  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(63,198,240,0.14)',
          border: '1px solid rgba(63,198,240,0.25)',
          borderRadius: 14,
          padding: 12,
        }}
      >
        <Skeleton height={32} radius={8} />
      </div>
    )
  }

  if (!tip) return null

  return (
    <div
      style={{
        backgroundColor: 'rgba(63,198,240,0.14)',
        border: '1px solid rgba(63,198,240,0.25)',
        borderRadius: 14,
        padding: 12,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}
    >
      <Sparkles size={14} strokeWidth={1.5} color="#3FC6F0" style={{ flexShrink: 0, marginTop: 1 }} />
      <p
        style={{
          color: '#3FC6F0',
          fontSize: 11,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {tip}
      </p>
    </div>
  )
}
