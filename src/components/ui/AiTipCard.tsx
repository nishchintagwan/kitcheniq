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
          backgroundColor: '#F5F0FA',
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
        backgroundColor: '#F5F0FA',
        borderRadius: 14,
        padding: 12,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}
    >
      <Sparkles size={14} strokeWidth={1.5} color="#7C3AED" style={{ flexShrink: 0, marginTop: 1 }} />
      <p
        style={{
          color: '#5B21B6',
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
