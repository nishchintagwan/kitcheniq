import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'

// Redirects already-authenticated users away from public pages (e.g. /login → /dashboard)
export default function PublicRoute({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      setChecked(true)
    })
  }, [])

  if (!checked) return null
  if (authed) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
