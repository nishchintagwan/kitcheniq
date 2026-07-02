import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Sparkles, X, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'
import GlacierHeader from '../components/ui/GlacierHeader'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import type { ImportedDish } from '../types'

type Phase = 'upload' | 'processing' | 'review' | 'error'

interface LocalDish extends ImportedDish {
  _id: string
}

const PROCESSING_MESSAGES = ['Finding dishes...', 'Reading prices...', 'Almost done...']

function makeId() { return Math.random().toString(36).slice(2, 9) }

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MenuImportScreen() {
  const navigate = useNavigate()
  const { restaurant } = useRestaurantStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const [dishes, setDishes] = useState<LocalDish[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [overLimit, setOverLimit] = useState(false)

  useEffect(() => {
    if (phase !== 'processing') return
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % PROCESSING_MESSAGES.length), 2000)
    return () => clearInterval(id)
  }, [phase])

  function handleZoneTap() { fileInputRef.current?.click() }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    }

    setPhase('processing')
    setMsgIndex(0)

    try {
      const base64 = await fileToBase64(file)
      const { data, error } = await supabase.functions.invoke('menu-import', {
        body: {
          imageBase64: base64,
          mediaType: file.type,
          restaurantId: restaurant?.id ?? '',
          cuisineType: restaurant?.cuisine_type ?? '',
          city: restaurant?.city ?? '',
        },
      })

      if (error) { setPhase('error'); return }

      const raw: ImportedDish[] = Array.isArray(data?.dishes) ? data.dishes : []
      const trimmed = raw.slice(0, 100)
      setOverLimit(raw.length > 100)
      setDishes(trimmed.map((d) => ({ ...d, _id: makeId() })))
      setPhase('review')
    } catch {
      setPhase('error')
    }
  }

  function removeDish(id: string) { setDishes((prev) => prev.filter((d) => d._id !== id)) }

  function updateDish(id: string, field: 'name' | 'selling_price', value: string) {
    setDishes((prev) =>
      prev.map((d) =>
        d._id === id
          ? { ...d, [field]: field === 'selling_price' ? Number(value) || 0 : value }
          : d
      )
    )
  }

  function addDish() {
    setDishes((prev) => [
      ...prev,
      { _id: makeId(), name: '', category: 'Main Course', selling_price: 0, confidence: 1, needs_review: false },
    ])
  }

  async function handleConfirm() {
    const restaurantId = restaurant?.id
    if (!restaurantId) return
    setIsSaving(true)
    try {
      const rows = dishes
        .filter((d) => d.name.trim())
        .map(({ name, category, selling_price }) => ({
          restaurant_id: restaurantId,
          name: name.trim(),
          category: category || 'Main Course',
          selling_price: selling_price ?? 0,
        }))
      if (rows.length > 0) await supabase.from('recipes').insert(rows)
      navigate('/onboarding/ingredients')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Import your menu" subtitle="Take a photo — AI will read it" />

      <div style={{ padding: '24px 16px 48px' }}>

        {/* Upload */}
        {phase === 'upload' && (
          <>
            <div
              onClick={handleZoneTap}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleZoneTap() }}
              style={{
                width: '100%',
                height: 180,
                borderRadius: 16,
                border: '1px dashed rgba(255,255,255,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                backgroundColor: '#161D2B',
                boxSizing: 'border-box',
              }}
            >
              <Camera size={32} strokeWidth={1.5} color="#3FC6F0" />
              <p style={{ color: '#F4F6FA', fontSize: 13, margin: 0, textAlign: 'center' }}>
                Take a photo of your menu
              </p>
              <p style={{ color: '#9AA4B8', fontSize: 11, margin: 0 }}>or upload a file</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div style={{ marginTop: 16 }}>
              <Button variant="ghost" fullWidth onClick={() => navigate('/onboarding/parse')}>
                Skip for now →
              </Button>
            </div>
          </>
        )}

        {/* Processing */}
        {phase === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {preview && (
              <img
                src={preview}
                alt="Menu preview"
                style={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            )}
            <Skeleton height={64} radius={14} />
            <Skeleton height={48} radius={10} />
            <Skeleton height={48} radius={10} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              <Sparkles size={14} strokeWidth={1.5} color="#3FC6F0" />
              <span style={{ color: '#3FC6F0', fontSize: 13 }}>
                {PROCESSING_MESSAGES[msgIndex]}
              </span>
            </div>
          </div>
        )}

        {/* Review */}
        {phase === 'review' && (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#F4F6FA', margin: '0 0 4px' }}>
              We found {dishes.length} dish{dishes.length !== 1 ? 'es' : ''}. Does this look right?
            </p>

            {overLimit && (
              <p style={{ color: '#F0A93F', fontSize: 11, margin: '0 0 12px' }}>
                Your menu had more than 100 dishes — showing the first 100.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, marginTop: 12 }}>
              {dishes.map((dish) => (
                <div
                  key={dish._id}
                  style={{
                    backgroundColor: '#161D2B',
                    borderRadius: 14,
                    border: `1px solid ${dish.confidence < 0.7 ? 'rgba(240,169,63,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    padding: 12,
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => removeDish(dish._id)}
                    aria-label="Remove dish"
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1,
                    }}
                  >
                    <X size={14} strokeWidth={1.5} color="#6B7588" />
                  </button>

                  {dish.confidence < 0.7 && (
                    <span
                      style={{
                        display: 'inline-block',
                        backgroundColor: 'rgba(240,169,63,0.14)',
                        color: '#F0A93F',
                        fontSize: 9,
                        fontWeight: 800,
                        borderRadius: 9999,
                        padding: '2px 8px',
                        marginBottom: 8,
                        textTransform: 'uppercase',
                      }}
                    >
                      Please review
                    </span>
                  )}

                  <input
                    value={dish.name}
                    onChange={(e) => updateDish(dish._id, 'name', e.target.value)}
                    placeholder="Dish name"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: 'transparent',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#F4F6FA',
                      outline: 'none',
                      fontFamily: 'inherit',
                      paddingRight: 24,
                      paddingBottom: 6,
                      marginBottom: 8,
                      display: 'block',
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        backgroundColor: 'rgba(63,198,240,0.1)',
                        color: '#3FC6F0',
                        fontSize: 10,
                        borderRadius: 9999,
                        padding: '2px 8px',
                      }}
                    >
                      {dish.category}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                      <span style={{ color: '#9AA4B8', fontSize: 12 }}>₹</span>
                      <input
                        type="number"
                        value={dish.selling_price || ''}
                        onChange={(e) => updateDish(dish._id, 'selling_price', e.target.value)}
                        placeholder="0"
                        style={{
                          width: 60,
                          border: 'none',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: 'transparent',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#F4F6FA',
                          outline: 'none',
                          fontFamily: 'inherit',
                          textAlign: 'right',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addDish}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'none', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 14,
                padding: '10px 16px', width: '100%', cursor: 'pointer',
                color: '#3FC6F0', fontSize: 13, fontFamily: 'inherit',
                marginBottom: 16, boxSizing: 'border-box',
              }}
            >
              <Plus size={14} strokeWidth={1.5} />
              Add dish
            </button>

            <Button fullWidth disabled={isSaving} onClick={handleConfirm}>
              {isSaving ? 'Saving...' : 'Looks good →'}
            </Button>
          </>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#9AA4B8', fontSize: 13, marginBottom: 16 }}>
              We couldn't read the menu — try another photo
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setPhase('upload')
                setPreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              Try again
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
