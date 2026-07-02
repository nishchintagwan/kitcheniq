import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getRestaurant } from '../lib/queries'
import Button from '../components/ui/Button'

export default function OtpScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [countdown, setCountdown] = useState(60)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) navigate('/login', { replace: true })
  }, [email, navigate])

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus()
  }

  async function handleVerify() {
    const token = digits.join('')
    if (token.length < 6) return

    setIsLoading(true)
    setError('')

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })

      if (verifyError) {
        setError('Incorrect code — please try again')
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)
        return
      }

      const userId = data.user?.id
      if (userId) {
        const restaurant = await getRestaurant(userId)
        navigate(restaurant ? '/dashboard' : '/setup', { replace: true })
      } else {
        navigate('/setup', { replace: true })
      }
    } catch {
      setError('Something went wrong — try again')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    if (countdown > 0) return
    try {
      await supabase.auth.signInWithOtp({ email })
      setDigits(Array(6).fill(''))
      setError('')
      setCountdown(60)
    } catch {
      // silently ignore
    }
  }

  const token = digits.join('')

  return (
    <div style={{ backgroundColor: '#0C111B', minHeight: '100vh' }}>
      {/* Back row */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
          Back
        </button>
      </div>

      <div style={{ padding: '40px 24px 0' }}>
        <h1
          style={{
            color: '#F4F6FA',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            margin: 0,
          }}
        >
          Check your email
        </h1>

        <p style={{ color: '#9AA4B8', fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
          We sent a 6-digit code to
        </p>
        <p style={{ color: '#3FC6F0', fontSize: 13, fontWeight: 600, margin: '2px 0 32px' }}>
          {email}
        </p>

        {/* OTP digit row */}
        <motion.div
          animate={isShaking ? { x: [-8, 8, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ display: 'flex', gap: 10, justifyContent: 'center' }}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              style={{
                width: 46,
                height: 56,
                backgroundColor: '#1B2436',
                border: `1px solid ${focusedIndex === i ? '#3FC6F0' : 'rgba(255,255,255,0.14)'}`,
                borderRadius: 12,
                textAlign: 'center',
                fontSize: 22,
                fontWeight: 800,
                color: '#F4F6FA',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
          ))}
        </motion.div>

        {error && (
          <p style={{ color: '#F0596B', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: 28 }}>
          <Button fullWidth disabled={isLoading || token.length < 6} onClick={handleVerify}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </div>

        <p
          style={{
            marginTop: 20,
            fontSize: 12,
            color: '#6B7588',
            textAlign: 'center',
          }}
        >
          Didn't receive it?{' '}
          <button
            onClick={handleResend}
            disabled={countdown > 0}
            style={{
              background: 'none',
              border: 'none',
              cursor: countdown > 0 ? 'default' : 'pointer',
              color: countdown > 0 ? '#6B7588' : '#3FC6F0',
              fontSize: 12,
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  )
}
