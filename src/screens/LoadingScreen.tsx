import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getRestaurant } from '../lib/queries'

export default function LoadingScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    async function redirect() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const restaurant = await getRestaurant(data.session.user.id)
      navigate(restaurant ? '/dashboard' : '/setup', { replace: true })
    }
    redirect()
  }, [navigate])

  return null
}
