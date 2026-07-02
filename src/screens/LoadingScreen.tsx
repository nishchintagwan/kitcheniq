import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRestaurantStore } from '../stores/restaurantStore'

export default function LoadingScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    async function redirect() {
      if (localStorage.getItem('kitcheniq_dev') === '1') {
        const { restaurant } = useRestaurantStore.getState()
        navigate(restaurant ? '/dashboard' : '/setup', { replace: true })
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      await useRestaurantStore.getState().fetchRestaurant(data.session.user.id)
      const { restaurant } = useRestaurantStore.getState()
      navigate(restaurant ? '/dashboard' : '/setup', { replace: true })
    }
    redirect()
  }, [navigate])

  return null
}
