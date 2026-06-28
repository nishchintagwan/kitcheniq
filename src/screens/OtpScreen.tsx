import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getRestaurant } from '../lib/queries'
import DarkHeader from '../components/ui/DarkHeader'
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

  // Redirect immediately if no email in state
  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true })
    }
  }, [email, navigate])

  // 60-second resend countdown, starts on mount
  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  function handleChange(index: number, value: string) {
    // Strip non-digits, keep only last character (handles replace of existing digit)
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    // Auto-advance to next box on digit entry
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    // Backspace on empty box → focus previous
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
    const lastFilled = Math.min(pasted.length - 1, 5)
    inputRefs.current[lastFilled]?.focus()
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
        setError('Incorrect code')
        setIsShaking(true)
        setTimeout(() => setIsShaking(false), 500)
        return
      }

      // Check if restaurant exists → route to dashboard or setup
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
      // silently ignore — user can tap again
    }
  }

  const token = digits.join('')

  return (
    <div style={{ backgroundColor: '#FFFAF5', minHeight: '100vh' }}>
      <DarkHeader
        title="Check your email"
        subtitle="Enter the 6-digit code we sent you"
        showBack
      />

      <div style={{ padding: '24px 16px 0' }}>
        {/* OTP digit row — animates shake on wrong code */}
        <motion.div
          animate={isShaking ? { x: [-8, 8, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
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
                width: 44,
                height: 52,
                backgroundColor: '#FFFFFF',
                border: `0.5px solid ${focusedIndex === i ? '#7C3AED' : '#EDE8F5'}`,
                borderRadius: 10,
                textAlign: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: '#1A1A1A',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          ))}
        </motion.div>

        {/* Inline error */}
        {error && (
          <p
            style={{
              color: '#FF505F',
              fontSize: 11,
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            {error}
          </p>
        )}

        {/* Verify button */}
        <div style={{ marginTop: 24 }}>
          <Button
            fullWidth
            disabled={isLoading || token.length < 6}
            onClick={handleVerify}
          >
            {isLoading ? 'Verifying...' : 'Verify code'}
          </Button>
        </div>

        {/* Resend with countdown */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <Button variant="ghost" disabled={countdown > 0} onClick={handleResend}>
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
          </Button>
        </div>
      </div>
    </div>
  )
}
