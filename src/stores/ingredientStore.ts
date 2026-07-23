import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Ingredient, PriceSpike, Recipe, Unit } from '../types'
import { getIngredients, upsertIngredientPrice, getKbPricesForCity } from '../lib/queries'
import { getSpikePercent, isSpikeAlert, calculateMargin } from '../lib/costCalculator'
import { supabase } from '../lib/supabase'

interface IngredientStore {
  ingredients: Ingredient[]
  isLoading: boolean
  lastUpdated: string | null
  spikes: PriceSpike[]
  dismissedSpikeIds: string[]
  // KB price fallback: kb_ingredient_id → price_per_kg for the restaurant's city.
  // Populated once per session. Used when ingredient.last_updated is >7 days old.
  kbPrices: Record<string, number>
  setIngredients: (ingredients: Ingredient[]) => void
  fetchIngredients: (restaurantId: string) => Promise<void>
  fetchKbPrices: (city: string) => Promise<void>
  updateIngredientPrice: (id: string, newPrice: number) => Promise<void>
  dismissSpike: (ingredientId: string) => void
  clearIngredients: () => void
}

interface RecipeRow {
  id: string
  restaurant_id: string
  name: string
  category: string
  selling_price: number
  serves: number
  wastage_percent: number
  overhead_percent: number
  created_at: string
  updated_at: string
  recipe_ingredients: Array<{ ingredient_id: string; quantity: number; unit: string }>
}

export const useIngredientStore = create<IngredientStore>()(
  persist(
    (set, get) => ({
      ingredients: [],
      isLoading: false,
      lastUpdated: null,
      spikes: [],
      dismissedSpikeIds: [],
      kbPrices: {},

      setIngredients: (ingredients) => set({ ingredients }),

      clearIngredients: () =>
        set({ ingredients: [], isLoading: false, lastUpdated: null, spikes: [], dismissedSpikeIds: [], kbPrices: {} }),

      fetchKbPrices: async (city) => {
        const prices = await getKbPricesForCity(city)
        set({ kbPrices: prices })
      },

      dismissSpike: (ingredientId) =>
        set((state) => ({
          dismissedSpikeIds: state.dismissedSpikeIds.includes(ingredientId)
            ? state.dismissedSpikeIds
            : [...state.dismissedSpikeIds, ingredientId],
        })),

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
            i.id === id ? { ...i, price_per_kg: newPrice, last_updated: new Date().toISOString() } : i
          ),
        })

        // Persist to Supabase and log to ingredient_price_history
        await upsertIngredientPrice(id, newPrice)

        if (!isSpikeAlert(changePercent)) {
          set({ lastUpdated: new Date().toISOString() })
          return
        }

        // ── Spike detected — build full affectedRecipes ──

        // Step 1: find recipe IDs that use this ingredient
        const { data: usages } = await supabase
          .from('recipe_ingredients')
          .select('recipe_id')
          .eq('ingredient_id', id)

        const recipeIds = [...new Set((usages ?? []).map((u: { recipe_id: string }) => u.recipe_id))]

        let affectedRecipes: PriceSpike['affectedRecipes'] = []

        if (recipeIds.length > 0) {
          // Step 2: fetch full recipe data + their ingredients in one query
          const { data: recipeRows } = await supabase
            .from('recipes')
            .select(
              'id, restaurant_id, name, category, selling_price, serves, wastage_percent, overhead_percent, created_at, updated_at, recipe_ingredients(ingredient_id, quantity, unit)'
            )
            .in('id', recipeIds)

          // Current ingredient prices (optimistic update already applied — new price is live)
          const { ingredients: currentIngredients } = get()

          affectedRecipes = (recipeRows as RecipeRow[] ?? []).map((row) => {
            const items = row.recipe_ingredients ?? []

            // Build ingredient inputs using current store prices
            const baseInputs = items.map((ri) => {
              const ing = currentIngredients.find((i) => i.id === ri.ingredient_id)
              return {
                ingredient_id: ri.ingredient_id,
                quantity: ri.quantity,
                unit: ri.unit as Unit,
                pricePerKg: ing?.price_per_kg ?? 0,
              }
            })

            // New margin: all at current prices (includes the new price already)
            const newMarginResult = calculateMargin({
              ingredients: baseInputs.map(({ quantity, unit, pricePerKg }) => ({ quantity, unit, pricePerKg })),
              sellingPrice: row.selling_price,
              serves: row.serves,
              wastagePercent: row.wastage_percent,
              overheadPercent: row.overhead_percent,
            })

            // Old margin: swap this ingredient back to previousPrice
            const oldMarginResult = calculateMargin({
              ingredients: baseInputs.map(({ ingredient_id, quantity, unit, pricePerKg }) => ({
                quantity,
                unit,
                pricePerKg: ingredient_id === id ? previousPrice : pricePerKg,
              })),
              sellingPrice: row.selling_price,
              serves: row.serves,
              wastagePercent: row.wastage_percent,
              overheadPercent: row.overhead_percent,
            })

            const recipe: Recipe = {
              id: row.id,
              restaurant_id: row.restaurant_id,
              name: row.name,
              category: row.category,
              selling_price: row.selling_price,
              serves: row.serves,
              wastage_percent: row.wastage_percent,
              overhead_percent: row.overhead_percent,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }

            return {
              recipe,
              oldMargin: oldMarginResult.marginPercent,
              newMargin: newMarginResult.marginPercent,
            }
          })

          // Step 3: log to ai_insights (best-effort, fire-and-forget)
          supabase
            .from('ai_insights')
            .insert({
              restaurant_id: existing.restaurant_id,
              insight_type: 'spike_alert',
              message: `${existing.name} price ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(Math.round(changePercent))}%`,
              data: {
                ingredientId: id,
                previousPrice,
                newPrice,
                changePercent,
                affectedRecipeIds: recipeIds,
              },
            })
            .then(() => {}, () => {})

          // Step 4: trigger AI spike recommendations Edge Function (fire-and-forget)
          supabase.functions
            .invoke('ai-spike-recommendations', {
              body: {
                restaurantId: existing.restaurant_id,
                ingredientId: id,
                ingredientName: existing.name,
                previousPrice,
                newPrice,
                changePercent,
                affectedRecipes: affectedRecipes.map((ar) => ({
                  recipeId: ar.recipe.id,
                  recipeName: ar.recipe.name,
                  oldMargin: ar.oldMargin,
                  newMargin: ar.newMargin,
                })),
              },
            })
            .catch(() => {})
        }

        const spike: PriceSpike = {
          ingredient: { ...existing, price_per_kg: newPrice },
          previousPrice,
          newPrice,
          changePercent,
          affectedRecipes,
        }

        set((state) => ({ spikes: [...state.spikes, spike] }))
        set({ lastUpdated: new Date().toISOString() })
      },
    }),
    { name: 'kitcheniq-ingredients' }
  )
)
