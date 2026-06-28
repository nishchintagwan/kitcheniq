import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Ingredient, PriceSpike } from '../types'
import { getIngredients, upsertIngredientPrice } from '../lib/queries'
import { getSpikePercent, isSpikeAlert } from '../lib/costCalculator'

interface IngredientStore {
  ingredients: Ingredient[]
  isLoading: boolean
  lastUpdated: string | null
  spikes: PriceSpike[]
  setIngredients: (ingredients: Ingredient[]) => void
  fetchIngredients: (restaurantId: string) => Promise<void>
  updateIngredientPrice: (id: string, newPrice: number) => Promise<void>
}

export const useIngredientStore = create<IngredientStore>()(
  persist(
    (set, get) => ({
      ingredients: [],
      isLoading: false,
      lastUpdated: null,
      spikes: [],

      setIngredients: (ingredients) => set({ ingredients }),

      fetchIngredients: async (restaurantId) => {
        set({ isLoading: true })
        const ingredients = await getIngredients(restaurantId)
        set({
          ingredients,
          isLoading: false,
          lastUpdated: new Date().toISOString(),
        })
      },

      updateIngredientPrice: async (id, newPrice) => {
        const { ingredients } = get()
        const existing = ingredients.find((i) => i.id === id)
        if (!existing) return

        const previousPrice = existing.price_per_kg
        const changePercent = getSpikePercent(previousPrice, newPrice)

        // Optimistic update — local state first, before Supabase confirms
        set({
          ingredients: ingredients.map((i) =>
            i.id === id ? { ...i, price_per_kg: newPrice } : i
          ),
        })

        // Persist to Supabase and log to ingredient_price_history
        await upsertIngredientPrice(id, newPrice)

        // Detect price spike (>= 15% change in either direction)
        if (isSpikeAlert(changePercent)) {
          const spike: PriceSpike = {
            ingredient: { ...existing, price_per_kg: newPrice },
            previousPrice,
            newPrice,
            changePercent,
            // affectedRecipes computed by consumer combining this spike with recipe margins
            affectedRecipes: [],
          }
          set((state) => ({ spikes: [...state.spikes, spike] }))
        }

        set({ lastUpdated: new Date().toISOString() })
      },
    }),
    { name: 'kitcheniq-ingredients' }
  )
)
