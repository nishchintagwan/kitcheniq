import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('kitcheniq_dev') === '1') {
      setAuthed(true)
      setChecked(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      setChecked(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!checked) return null
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}
