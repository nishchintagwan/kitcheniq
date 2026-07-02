import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'

const emailSchema = z.string().email()

export default function SplashScreen() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const result = emailSchema.safeParse(email)
    if (!result.success) {
      setError('Enter a valid email address')
      return
    }

    setIsLoading(true)
    try {
      const { error: supabaseError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (supabaseError) {
        setError('Something went wrong — try again')
        return
      }
      navigate('/otp', { state: { email } })
    } catch {
      setError('Something went wrong — try again')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', backgroundColor: '#0C111B' }}>

      {/* Hero kitchen background image */}
      <img
        src="/ai-images/login-kitchen-bg.png"
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 20%',
          opacity: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Gradient overlay — fades image into dark at bottom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(12,17,27,0.12) 0%, rgba(12,17,27,0.82) 52%, #0C111B 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content layer */}
      <div
        style={{
          position: 'relative',
          padding: '360px 24px 48px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        <Logo />

        <p
          style={{
            color: '#9AA4B8',
            fontSize: 13,
            lineHeight: 1.5,
            margin: '10px 0 32px',
          }}
        >
          AI-Powered Margin Intelligence for Indian Restaurants
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="your@email.com"
            autoComplete="email"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#1B2436',
              border: `1px solid ${focused ? '#3FC6F0' : 'rgba(255,255,255,0.14)'}`,
              borderRadius: 12,
              padding: '13px 16px',
              fontSize: 14,
              color: '#F4F6FA',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
          />

          {error && (
            <p style={{ color: '#F0596B', fontSize: 11, margin: '6px 0 0' }}>
              {error}
            </p>
          )}

          <div style={{ marginTop: 12 }}>
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Log In'}
            </Button>
          </div>
        </form>

        <div
          style={{
            marginTop: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#6B7588',
            fontSize: 11,
          }}
        >
          <Shield size={14} strokeWidth={1.5} color="#6B7588" />
          Secure. Smart. Built for Indian kitchens.
        </div>

      </div>
    </div>
  )
}
