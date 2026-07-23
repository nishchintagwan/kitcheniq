import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Recipe, RecipeIngredient, MarginResult } from '../types'
import { getRecipes, getRecipeIngredients } from '../lib/queries'
import { calculateMargin } from '../lib/costCalculator'
import { useIngredientStore } from './ingredientStore'

interface RecipeStore {
  recipes: Recipe[]
  recipeIngredients: Record<string, RecipeIngredient[]>
  isLoading: boolean
  setRecipes: (recipes: Recipe[]) => void
  fetchRecipes: (restaurantId: string) => Promise<void>
  fetchRecipeIngredients: (recipeId: string) => Promise<void>
  getMarginForRecipe: (recipeId: string) => MarginResult | null
  getEstimatedMonthlySales: () => { sales: number; cogs: number }
  getAggregateMargin: () => number
  updateRecipePrice: (recipeId: string, newPrice: number) => void
  clearRecipes: () => void
}

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      recipes: [],
      recipeIngredients: {},
      isLoading: false,

      setRecipes: (recipes) => set({ recipes }),

      fetchRecipes: async (restaurantId) => {
        set({ isLoading: true })
        const recipes = await getRecipes(restaurantId)
        set({ recipes, isLoading: false })
      },

      fetchRecipeIngredients: async (recipeId) => {
        const items = await getRecipeIngredients(recipeId)
        set((state) => ({
          recipeIngredients: { ...state.recipeIngredients, [recipeId]: items },
        }))
      },

      getEstimatedMonthlySales: () => {
        const { recipes, recipeIngredients } = get()
        const { ingredients } = useIngredientStore.getState()
        let totalSales = 0
        let totalCost = 0
        recipes.forEach((recipe) => {
          const items = recipeIngredients[recipe.id] || []
          if (items.length === 0) return
          const ingredientInputs = items.map((ri) => {
            const ing = ingredients.find((i) => i.id === ri.ingredient_id)
            return { quantity: ri.quantity, unit: ri.unit, pricePerKg: ing?.price_per_kg ?? 0 }
          })
          const result = calculateMargin({
            ingredients: ingredientInputs,
            sellingPrice: recipe.selling_price,
            serves: recipe.serves,
            wastagePercent: recipe.wastage_percent,
            overheadPercent: recipe.overhead_percent,
          })
          totalSales += recipe.selling_price * 30
          totalCost += result.totalCost * 30
        })
        return { sales: totalSales, cogs: totalCost }
      },

      getAggregateMargin: () => {
        const { sales, cogs } = get().getEstimatedMonthlySales()
        if (sales === 0) return 0
        return Math.max(0, Math.min(100, ((sales - cogs) / sales) * 100))
      },

      updateRecipePrice: (recipeId, newPrice) =>
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === recipeId ? { ...r, selling_price: newPrice } : r
          ),
        })),

      clearRecipes: () => set({ recipes: [], recipeIngredients: {}, isLoading: false }),

      // Single source of truth for all margin calculations in the app.
      // Reads current ingredient prices live from ingredientStore so that
      // a price update immediately reflects here without any manual invalidation.
      //
      // Price resolution order (matches the KB price resolution rule):
      //   1. Owner price if last_updated within 7 days → use ingredients.price_per_kg
      //   2. KB price if kb_ingredient_id is set → use kbPrices[kb_ingredient_id]
      //   3. Fallback to owner price regardless (possibly stale, no KB match)
      getMarginForRecipe: (recipeId) => {
        const { recipes, recipeIngredients } = get()
        const recipe = recipes.find((r) => r.id === recipeId)
        if (!recipe) return null

        const items = recipeIngredients[recipeId]
        // undefined = not yet fetched → hide while loading
        if (items === undefined) return null
        // [] = fetched but no ingredients added yet → show with 0% margin
        if (items.length === 0) {
          return {
            rawCost: 0, wastageCost: 0, overheadCost: 0, totalCost: 0,
            marginPercent: 0, profitPerDish: 0, status: 'critical' as const,
          }
        }

        // Always read from ingredientStore.getState() — never cache here
        const { ingredients, kbPrices } = useIngredientStore.getState()
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

        const ingredientInputs = items.map((ri) => {
          const ing = ingredients.find((i) => i.id === ri.ingredient_id)
          if (!ing) return { quantity: ri.quantity, unit: ri.unit, pricePerKg: 0 }

          const ownerPriceFresh = new Date(ing.last_updated).getTime() >= sevenDaysAgo
          const kbPrice = ing.kb_ingredient_id ? kbPrices[ing.kb_ingredient_id] : undefined
          const pricePerKg = ownerPriceFresh || kbPrice == null
            ? ing.price_per_kg
            : kbPrice

          return { quantity: ri.quantity, unit: ri.unit, pricePerKg }
        })

        return calculateMargin({
          ingredients: ingredientInputs,
          sellingPrice: recipe.selling_price,
          serves: recipe.serves,
          wastagePercent: recipe.wastage_percent,
          overheadPercent: recipe.overhead_percent,
        })
      },
    }),
    { name: 'kitcheniq-recipes' }
  )
)
