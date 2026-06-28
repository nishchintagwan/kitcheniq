import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Restaurant } from '../types'
import { getRestaurant } from '../lib/queries'

interface RestaurantStore {
  restaurant: Restaurant | null
  isLoading: boolean
  error: string | null
  setRestaurant: (restaurant: Restaurant) => void
  clearRestaurant: () => void
  fetchRestaurant: (ownerId: string) => Promise<void>
}

export const useRestaurantStore = create<RestaurantStore>()(
  persist(
    (set) => ({
      restaurant: null,
      isLoading: false,
      error: null,

      setRestaurant: (restaurant) => set({ restaurant }),

      clearRestaurant: () => set({ restaurant: null }),

      fetchRestaurant: async (ownerId) => {
        set({ isLoading: true, error: null })
        const restaurant = await getRestaurant(ownerId)
        if (restaurant) {
          set({ restaurant, isLoading: false })
        } else {
          set({ isLoading: false, error: 'Restaurant not found' })
        }
      },
    }),
    { name: 'kitcheniq-restaurant' }
  )
)
