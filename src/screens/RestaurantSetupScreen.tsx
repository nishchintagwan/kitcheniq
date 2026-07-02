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

const darkInput: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#1B2436',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 13,
  color: '#F4F6FA',
  fontFamily: 'inherit',
  outline: 'none',
  appearance: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  fontWeight: 800,
  color: '#6B7588',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
}

const errorStyle: React.CSSProperties = {
  color: '#F0596B',
  fontSize: 11,
  marginTop: 4,
}

export default function RestaurantSetupScreen() {
  const navigate = useNavigate()
  const { setRestaurant } = useRestaurantStore()
  const [isSaving, setIsSaving] = useState(false)
  const [showFssai, setShowFssai] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

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

  function focusedInput(field: string): React.CSSProperties {
    return { ...darkInput, border: `1px solid ${focusedField === field ? '#3FC6F0' : 'rgba(255,255,255,0.14)'}` }
  }

  function selectCity(city: string) {
    setSelectedCity(city)
    setValue('city', city, { shouldValidate: true })
  }

  function selectCuisine(value: CuisineType) {
    setSelectedCuisine(value)
    setValue('cuisine_type', value, { shouldValidate: true })
  }

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      <GlacierHeader title="Set up your restaurant" subtitle="Takes 30 seconds" />

      {/* Hidden inputs for RHF registration */}
      <input type="hidden" {...register('city')} />
      <input type="hidden" {...register('cuisine_type')} />

      <div style={{ padding: '24px 16px 48px' }}>
        {isSaving ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={48} radius={12} />)}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Restaurant name */}
              <div>
                <label style={labelStyle}>Restaurant name</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Sharma's Kitchen"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  style={focusedInput('name')}
                />
                {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
              </div>

              {/* City chips */}
              <div>
                <label style={labelStyle}>City</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {cities.map((city) => {
                    const active = selectedCity === city
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => selectCity(city)}
                        style={{
                          backgroundColor: active ? '#3FC6F0' : '#1B2436',
                          color: active ? '#04212E' : '#9AA4B8',
                          border: active ? 'none' : '1px solid rgba(255,255,255,0.14)',
                          borderRadius: 9999,
                          padding: '7px 14px',
                          fontSize: 12,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          fontWeight: active ? 700 : 400,
                        }}
                      >
                        {city}
                      </button>
                    )
                  })}
                </div>
                {errors.city && <p style={errorStyle}>{errors.city.message}</p>}
              </div>

              {/* Cuisine type chips */}
              <div>
                <label style={labelStyle}>Cuisine type</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {cuisines.map((c) => {
                    const active = selectedCuisine === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => selectCuisine(c.value)}
                        style={{
                          backgroundColor: active ? '#3FC6F0' : '#1B2436',
                          color: active ? '#04212E' : '#9AA4B8',
                          border: active ? 'none' : '1px solid rgba(255,255,255,0.14)',
                          borderRadius: 9999,
                          padding: '7px 14px',
                          fontSize: 12,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          fontWeight: active ? 700 : 400,
                        }}
                      >
                        {c.label}
                      </button>
                    )
                  })}
                </div>
                {errors.cuisine_type && <p style={errorStyle}>{errors.cuisine_type.message}</p>}
              </div>

              {/* FSSAI — collapsible */}
              <div>
                {!showFssai ? (
                  <button
                    type="button"
                    onClick={() => setShowFssai(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#3FC6F0',
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
                      style={focusedInput('fssai')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFssai(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '6px 0 0',
                        color: '#6B7588',
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
