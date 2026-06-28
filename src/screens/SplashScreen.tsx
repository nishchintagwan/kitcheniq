import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      setError('Enter a valid email')
      return
    }

    setIsLoading(true)
    try {
      const { error: supabaseError } = await supabase.auth.signInWithOtp({ email })
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
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: '#0D0A14',
        overflow: 'hidden',
      }}
    >
      {/* Primary saffron glow — top-right */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(232,99,10,0.28), rgba(232,99,10,0.10), transparent)',
          animation: 'breathe 4s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* Secondary saffron halo — top-right, softer */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -20,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.14), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Purple counter-glow — bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          left: -40,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent)',
          pointerEvents: 'none',
        }}
      />

      {/* Main content — vertically centered */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px 24px 80px',
          position: 'relative',
        }}
      >
        {/* Logo with breathe */}
        <div style={{ animation: 'breathe 4s ease-in-out infinite' }}>
          <Logo size={48} />
        </div>

        {/* App name */}
        <h1
          style={{
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            margin: '16px 0 0',
            textAlign: 'center',
          }}
        >
          KitchenIQ
        </h1>

        {/* Tagline */}
        <p
          style={{
            color: 'rgba(255,255,255,0.50)',
            fontSize: 12,
            margin: '8px 0 40px',
            textAlign: 'center',
          }}
        >
          Your restaurant's AI brain
        </p>

        {/* Email form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Enter your email"
            autoComplete="email"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: `1px solid ${focused ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.12)'}`,
              color: '#FFFFFF',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />

          {error && (
            <p
              style={{
                color: '#FF505F',
                fontSize: 11,
                margin: '6px 0 0',
              }}
            >
              {error}
            </p>
          )}

          <div style={{ marginTop: 12 }}>
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Get started →'}
            </Button>
          </div>
        </form>
      </div>

      {/* Beta badge — bottom-right corner */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: 'rgba(124,58,237,0.2)',
          color: '#A78BFA',
          fontSize: 9,
          borderRadius: 9999,
          padding: '4px 8px',
          pointerEvents: 'none',
        }}
      >
        Beta — Free
      </div>
    </div>
  )
}
