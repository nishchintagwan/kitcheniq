import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { getRestaurant } from '../lib/queries'
import { useRestaurantStore } from '../stores/restaurantStore'
import GlacierHeader from '../components/ui/GlacierHeader'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import type { CuisineType } from '../types'

const schema = z.object({
  name: z.string().min(2, 'Enter your restaurant name'),
  city: z.string().min(1, 'Select a city'),
  cuisine_type: z.string().min(1, 'Select a cuisine type'),
  fssai_number: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Other']

const cuisines: { label: string; value: CuisineType }[] = [
  { label: 'North Indian',  value: 'north-indian'  },
  { label: 'South Indian',  value: 'south-indian'  },
  { label: 'Chinese',       value: 'chinese'       },
  { label: 'Continental',   value: 'continental'   },
  { label: 'Multi-cuisine', value: 'multi-cuisine' },
  { label: 'Other',         value: 'other'         },
]

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  backgroundColor: '#FFFAF5',
  border: '0.5px solid #EDE8F5',
  borderRadius: 10,
  padding: '12px 16px',
  fontSize: 13,
  color: '#1A1A1A',
  fontFamily: 'inherit',
  outline: 'none',
  appearance: 'none' as const,
}

const labelStyle = {
  display: 'block' as const,
  fontSize: 11,
  fontWeight: 500,
  color: '#888888',
  marginBottom: 6,
}

const errorStyle = {
  color: '#FF505F',
  fontSize: 11,
  marginTop: 4,
}

export default function RestaurantSetupScreen() {
  const navigate = useNavigate()
  const { setRestaurant } = useRestaurantStore()

  const [isSaving, setIsSaving]       = useState(false)
  const [showFssai, setShowFssai]     = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  // On mount: if user already has a restaurant, skip to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id
      if (!userId) return
      const existing = await getRestaurant(userId)
      if (existing) navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  async function onSubmit(formData: FormData) {
    setIsSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) return

      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          owner_id: userId,
          name: formData.name,
          city: formData.city,
          cuisine_type: formData.cuisine_type,
          fssai_number: formData.fssai_number || null,
        })
        .select()
        .single()

      if (error || !data) return

      setRestaurant(data)
      navigate('/onboarding/import')
    } finally {
      setIsSaving(false)
    }
  }

  function focusStyle(field: string) {
    return focusedField === field
      ? { ...inputStyle, border: '0.5px solid #7C3AED' }
      : inputStyle
  }

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <GlacierHeader
        title="Set up your restaurant"
        subtitle="Takes 30 seconds"
      />

      <div style={{ padding: '24px 16px 0' }}>
        {isSaving ? (
          /* Skeleton shown while save request is in flight */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Skeleton height={48} radius={10} />
            <Skeleton height={48} radius={10} />
            <Skeleton height={48} radius={10} />
            <Skeleton height={48} radius={10} />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Field 1: Restaurant name */}
              <div>
                <label style={labelStyle}>Restaurant name</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Sharma's Kitchen"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  style={focusStyle('name')}
                />
                {errors.name && (
                  <p style={errorStyle}>{errors.name.message}</p>
                )}
              </div>

              {/* Field 2: City */}
              <div>
                <label style={labelStyle}>City</label>
                <select
                  {...register('city')}
                  onFocus={() => setFocusedField('city')}
                  onBlur={() => setFocusedField(null)}
                  style={focusStyle('city')}
                  defaultValue=""
                >
                  <option value="" disabled>Select city</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.city && (
                  <p style={errorStyle}>{errors.city.message}</p>
                )}
              </div>

              {/* Field 3: Cuisine type */}
              <div>
                <label style={labelStyle}>Cuisine type</label>
                <select
                  {...register('cuisine_type')}
                  onFocus={() => setFocusedField('cuisine_type')}
                  onBlur={() => setFocusedField(null)}
                  style={focusStyle('cuisine_type')}
                  defaultValue=""
                >
                  <option value="" disabled>Select cuisine</option>
                  {cuisines.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {errors.cuisine_type && (
                  <p style={errorStyle}>{errors.cuisine_type.message}</p>
                )}
              </div>

              {/* FSSAI — collapsible, hidden behind a link */}
              <div>
                {!showFssai ? (
                  <button
                    type="button"
                    onClick={() => setShowFssai(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#7C3AED',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    + Add FSSAI number (optional)
                  </button>
                ) : (
                  <div>
                    <label style={labelStyle}>FSSAI number</label>
                    <input
                      {...register('fssai_number')}
                      placeholder="14-digit FSSAI licence number"
                      onFocus={() => setFocusedField('fssai')}
                      onBlur={() => setFocusedField(null)}
                      style={focusStyle('fssai')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFssai(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px 0 0',
                        color: '#888888',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'block',
                      }}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div style={{ paddingTop: 8 }}>
                <Button type="submit" fullWidth>
                  Let's go →
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
