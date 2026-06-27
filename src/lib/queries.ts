import { supabase } from './supabase'
import type {
  Restaurant,
  Recipe,
  Ingredient,
  RecipeIngredient,
  IngredientPriceHistory,
} from '../types'

export async function getRestaurant(ownerId: string): Promise<Restaurant | null> {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', ownerId)
      .single()
    if (error) throw error
    return data as Restaurant
  } catch (error) {
    console.error('[getRestaurant]', error)
    return null
  }
}

export async function getRecipes(restaurantId: string): Promise<Recipe[]> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Recipe[]
  } catch (error) {
    console.error('[getRecipes]', error)
    return []
  }
}

export async function getIngredients(restaurantId: string): Promise<Ingredient[]> {
  try {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name', { ascending: true })
    if (error) throw error
    return (data ?? []) as Ingredient[]
  } catch (error) {
    console.error('[getIngredients]', error)
    return []
  }
}

export async function getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
    if (error) throw error
    return (data ?? []) as RecipeIngredient[]
  } catch (error) {
    console.error('[getRecipeIngredients]', error)
    return []
  }
}

export async function getPriceHistory(
  ingredientId: string,
  limit = 10
): Promise<IngredientPriceHistory[]> {
  try {
    const { data, error } = await supabase
      .from('ingredient_price_history')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('recorded_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as IngredientPriceHistory[]
  } catch (error) {
    console.error('[getPriceHistory]', error)
    return []
  }
}

export async function upsertIngredientPrice(
  ingredientId: string,
  newPrice: number
): Promise<boolean> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('ingredients')
      .select('price_per_kg')
      .eq('id', ingredientId)
      .single()
    if (fetchError) throw fetchError

    const changePercent = existing
      ? ((newPrice - (existing as Ingredient).price_per_kg) /
          (existing as Ingredient).price_per_kg) *
        100
      : null

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ price_per_kg: newPrice, last_updated: new Date().toISOString() })
      .eq('id', ingredientId)
    if (updateError) throw updateError

    const { error: historyError } = await supabase
      .from('ingredient_price_history')
      .insert({
        ingredient_id: ingredientId,
        price_per_kg: newPrice,
        recorded_at: new Date().toISOString(),
        change_percent: changePercent,
      })
    if (historyError) throw historyError

    return true
  } catch (error) {
    console.error('[upsertIngredientPrice]', error)
    return false
  }
}
