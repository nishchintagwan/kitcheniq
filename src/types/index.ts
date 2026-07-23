// Enums
export type MarginStatus = 'healthy' | 'watch' | 'critical'
export type Unit = 'kg' | 'gram' | 'litre' | 'ml' | 'piece' | 'dozen'
export type CuisineType = 'north-indian' | 'south-indian' | 'chinese' | 'continental' | 'multi-cuisine' | 'other'

// Database entities (match Supabase schema exactly)
export interface Restaurant {
  id: string
  owner_id: string
  name: string
  city: string
  cuisine_type: CuisineType
  fssai_number?: string
  created_at: string
  updated_at: string
}

export interface Ingredient {
  id: string
  restaurant_id: string
  name: string
  price_per_kg: number   // always stored as price per kg equivalent
  unit: Unit             // the unit the owner thinks in
  last_updated: string
  created_at: string
  kb_ingredient_id?: string  // set by kb-matcher webhook on insert; null = no KB match
}

export interface KbIngredientPrice {
  kb_ingredient_id: string
  city: string
  price_per_kg: number
  source: 'agmarknet' | 'manual_seed' | 'owner'
  recorded_at: string
}

export interface Recipe {
  id: string
  restaurant_id: string
  name: string
  category: string
  selling_price: number
  wastage_percent: number    // default 10
  overhead_percent: number   // default 20
  serves: number             // default 1
  created_at: string
  updated_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_id: string
  quantity: number    // in the ingredient's native unit
  unit: Unit
}

export interface IngredientPriceHistory {
  id: string
  ingredient_id: string
  price_per_kg: number
  recorded_at: string
  change_percent?: number
}

export interface NutritionData {
  id: string
  recipe_id: string
  energy_kcal: number
  protein_g: number
  carbs_g: number
  sugars_g: number
  fat_g: number
  saturated_fat_g: number
  fibre_g: number
  sodium_mg: number
  is_ai_estimate: boolean
  calculated_at: string
}

export interface AiTip {
  id: string
  recipe_id: string
  tip_text: string
  created_at: string
  expires_at: string
}

export interface AiInsight {
  id: string
  restaurant_id: string
  insight_type: 'reprice' | 'promote' | 'remove' | 'spike_alert'
  recipe_id?: string | null
  message: string
  data: Record<string, unknown>
  created_at: string
  dismissed_at?: string
}

export interface MenuImport {
  id: string
  restaurant_id: string
  raw_claude_output: string
  dishes_found: number
  status: 'pending' | 'reviewed' | 'applied'
  created_at: string
}

// Computed types — never stored in DB
export interface MarginResult {
  rawCost: number
  wastageCost: number
  overheadCost: number
  totalCost: number
  marginPercent: number
  profitPerDish: number
  status: MarginStatus
}

export interface DishSummary {
  recipe: Recipe
  margin: MarginResult
  ingredients: (RecipeIngredient & { ingredient: Ingredient })[]
  aiTip?: AiTip
}

export interface PriceSpike {
  ingredient: Ingredient
  previousPrice: number
  newPrice: number
  changePercent: number
  affectedRecipes: { recipe: Recipe; oldMargin: number; newMargin: number }[]
}

// Onboarding types
export interface ImportedDish {
  name: string
  category: string
  selling_price: number
  confidence: number   // 0–1, flag for review if < 0.7
  needs_review: boolean
}
