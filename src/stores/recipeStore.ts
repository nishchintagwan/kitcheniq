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
  updateRecipePrice: (recipeId: string, newPrice: number) => void
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

      updateRecipePrice: (recipeId, newPrice) =>
        set((state) => ({
          recipes: state.recipes.map((r) =>
            r.id === recipeId ? { ...r, selling_price: newPrice } : r
          ),
        })),

      // Single source of truth for all margin calculations in the app.
      // Reads current ingredient prices live from ingredientStore so that
      // a price update immediately reflects here without any manual invalidation.
      getMarginForRecipe: (recipeId) => {
        const { recipes, recipeIngredients } = get()
        const recipe = recipes.find((r) => r.id === recipeId)
        const items = recipeIngredients[recipeId]
        if (!recipe || !items || items.length === 0) return null

        // Always read from ingredientStore.getState() — never cache here
        const { ingredients } = useIngredientStore.getState()

        const ingredientInputs = items.map((ri) => {
          const ing = ingredients.find((i) => i.id === ri.ingredient_id)
          return {
            quantity: ri.quantity,
            unit: ri.unit,
            pricePerKg: ing?.price_per_kg ?? 0,
          }
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
