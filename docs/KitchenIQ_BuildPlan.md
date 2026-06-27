# KitchenIQ — Claude Code Build Plan
### Paste each prompt into Claude Code in sequence. Do not skip steps.
### Every prompt assumes the previous one completed successfully.

---

## HOW TO USE THIS PLAN

- Copy each prompt block exactly as written into Claude Code
- Wait for Claude Code to finish and confirm before moving to the next
- If a step fails, fix it before proceeding — later steps depend on earlier ones
- The `VERIFY:` line at the end of each step tells you what to check before continuing
- Estimated total: 4 weeks, working in sequence

---

---

# PHASE 1 — FOUNDATION
## ~1–2 days

---

### STEP 1.1 — Project scaffold

```
Create a new KitchenIQ project from scratch using Vite with the React TypeScript template.

Run: npm create vite@latest kitcheniq -- --template react-ts

Then install all dependencies:
npm install framer-motion react-router-dom zustand react-hook-form zod @tanstack/react-query lucide-react recharts @supabase/supabase-js

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

Set up the project structure with these folders:
src/
  components/
    ui/          ← shared UI components
    layout/      ← layout wrappers
  screens/       ← one file per route
  lib/           ← utilities and clients
  stores/        ← Zustand stores
  types/         ← TypeScript interfaces
  hooks/         ← custom React hooks

Do not create any screen files yet. Just scaffold the folder structure and confirm deps installed.
```

**VERIFY:** `npm run dev` starts without errors. All folders exist.

---

### STEP 1.2 — Global CSS and Tailwind config

```
Replace src/index.css entirely with the following — do not keep any existing content:

@tailwind base;
@tailwind components;
@tailwind utilities;

@keyframes breathe {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; }
}
@keyframes drift1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(5px, -7px); }
}
@keyframes drift2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-4px, 5px); }
}
@keyframes drift3 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(7px, 4px); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

* { -webkit-tap-highlight-color: transparent; }

body {
  background-color: #FFFAF5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
}

Then replace tailwind.config.ts with this exact content — the colour palette is locked and must not be changed:

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          action: '#7C3AED',
          'action-shadow': 'rgba(124,58,237,0.3)',
        },
        bg: {
          base: '#FFFAF5',
          card: '#FFFFFF',
          header: '#0D0A14',
        },
        border: {
          DEFAULT: '#EDE8F5',
          track: '#F5F0FA',
        },
        text: {
          primary: '#1A1A1A',
          'on-dark': '#FFFFFF',
          secondary: '#888888',
          muted: 'rgba(255,255,255,0.36)',
          inactive: '#BBBBBB',
        },
        healthy: {
          DEFAULT: '#00DC82',
          card: '#003D20',
          badge: '#F0FBF5',
          'badge-text': '#00A36C',
        },
        watch: {
          DEFAULT: '#FBB924',
          card: '#3D2000',
          badge: '#FFF8EC',
          'badge-text': '#F59E0B',
        },
        critical: {
          DEFAULT: '#FF505F',
          card: '#3D0008',
          badge: '#FFF5F6',
          'badge-text': '#FF505F',
        },
        ai: {
          bg: '#F5F0FA',
          text: '#5B21B6',
          icon: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

**VERIFY:** Tailwind classes like `bg-bg-base` and `text-brand-action` resolve correctly in a test component.

---

### STEP 1.3 — TypeScript types

```
Create src/types/index.ts with all domain types for KitchenIQ.

Include these exact types (do not simplify or merge them):

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
  insight_type: 'reprice' | 'promote' | 'remove'
  recipe_id: string
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
```

**VERIFY:** No TypeScript errors. Import a type in App.tsx to confirm it resolves.

---

### STEP 1.4 — Cost calculator library

```
Create src/lib/costCalculator.ts — this is the most important library in the app. Every margin displayed anywhere comes from this file. Never call it from Edge Functions; it is UI-only.

Implement these functions exactly:

1. toBaseUnit(quantity: number, unit: Unit): number
   Converts any quantity to its kg/litre equivalent for cost calculation.
   Conversion table:
   - kg → 1
   - gram → 0.001
   - litre → 1
   - ml → 0.001
   - piece → 1 (treat as 1 unit, price_per_kg is actually price_per_piece for pieces)
   - dozen → 12

2. ingredientCost(quantity: number, unit: Unit, pricePerKg: number): number
   Returns cost in rupees for a given quantity of an ingredient.
   Formula: toBaseUnit(quantity, unit) × pricePerKg

3. calculateMargin(params: {
     ingredients: { quantity: number; unit: Unit; pricePerKg: number }[]
     sellingPrice: number
     serves: number
     wastagePercent: number
     overheadPercent: number
   }): MarginResult
   
   Implements the spec formula exactly:
   raw_cost = SUM(ingredientCost for each) / serves
   wastage_cost = raw_cost × (wastagePercent / 100)
   overhead_cost = raw_cost × (overheadPercent / 100)
   total_cost = raw_cost + wastage_cost + overhead_cost
   margin_percent = ((sellingPrice - total_cost) / sellingPrice) × 100
   profit_per_dish = sellingPrice - total_cost
   
   status thresholds:
   - margin_percent >= 50 → 'healthy'
   - margin_percent >= 30 → 'watch'
   - else → 'critical'

4. getMarginStatus(marginPercent: number): MarginStatus
   Standalone helper for status colour lookups.

5. formatCurrency(amount: number): string
   Returns '₹1,234' format. Always show ₹ symbol. Round to nearest rupee.

6. formatMargin(percent: number): string
   Returns '64.3%' format. Always 1 decimal place.

7. getSpikePercent(oldPrice: number, newPrice: number): number
   Returns the percentage change. Positive = increase, negative = decrease.

8. isSpikeAlert(changePercent: number): boolean
   Returns true if Math.abs(changePercent) >= 15

After implementing, write inline test calls at the bottom inside a comment block that I can use to verify:
// TEST: calculateMargin with Dal Makhani example
// ingredients: tomato 200g @₹60/kg, cream 100ml @₹400/litre, butter 50g @₹500/kg
// selling_price: 280, serves: 1, wastage: 10%, overhead: 20%
// Expected: total_cost ~₹132, margin ~52.8%, status: 'healthy'
```

**VERIFY:** Run the test case mentally or in a console. Margin should be ~52.8% for the example.

---

### STEP 1.5 — Supabase client

```
Create src/lib/supabase.ts:

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

Create .env.local with placeholders:
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here

Create .env.local.example with the same content (for the repo).

Add .env.local to .gitignore if not already there.

Then create src/lib/queries.ts with typed Supabase query helpers for the most common operations:
- getRestaurant(ownerId: string)
- getRecipes(restaurantId: string)
- getIngredients(restaurantId: string)
- getRecipeIngredients(recipeId: string)
- getPriceHistory(ingredientId: string, limit?: number)
- upsertIngredientPrice(ingredientId: string, newPrice: number)

Each function should return typed data using the interfaces from src/types/index.ts. Handle errors by returning null and logging.
```

**VERIFY:** Supabase client imports without error. .env.local is gitignored.

---

### STEP 1.6 — Supabase schema migration

```
Create supabase/migrations/001_initial_schema.sql with the complete KitchenIQ schema.

Tables to create:

restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  city text not null,
  cuisine_type text not null,
  fssai_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  price_per_kg numeric not null default 0,
  unit text not null default 'kg',
  last_updated timestamptz default now(),
  created_at timestamptz default now()
)

recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  category text not null default 'Main Course',
  selling_price numeric not null default 0,
  wastage_percent numeric not null default 10,
  overhead_percent numeric not null default 20,
  serves integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantity numeric not null,
  unit text not null
)

ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  price_per_kg numeric not null,
  change_percent numeric,
  recorded_at timestamptz default now()
)

nutrition_data (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade unique,
  energy_kcal numeric,
  protein_g numeric,
  carbs_g numeric,
  sugars_g numeric,
  fat_g numeric,
  saturated_fat_g numeric,
  fibre_g numeric,
  sodium_mg numeric,
  is_ai_estimate boolean default true,
  calculated_at timestamptz default now()
)

ai_tips (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  tip_text text not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
)

ai_insights (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  insight_type text not null,
  recipe_id uuid references recipes(id) on delete cascade,
  message text not null,
  data jsonb default '{}',
  created_at timestamptz default now(),
  dismissed_at timestamptz
)

menu_imports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  raw_claude_output jsonb,
  dishes_found integer default 0,
  status text default 'pending',
  created_at timestamptz default now()
)

Then add RLS policies:
- Enable RLS on all tables except ingredient_nutrition
- Each table: policy allowing SELECT/INSERT/UPDATE/DELETE where restaurant_id matches the user's restaurant, or for restaurants table where owner_id = auth.uid()

Then create supabase/seeds/001_ingredients.sql with the 40 common Indian restaurant ingredients pre-loaded with typical Delhi metro prices:
Tomato ₹60/kg, Onion ₹40/kg, Potato ₹30/kg, Garlic ₹200/kg, Ginger ₹160/kg,
Green chilli ₹80/kg, Coriander ₹120/kg, Capsicum ₹80/kg, Spinach ₹60/kg,
Peas ₹100/kg, Cauliflower ₹50/kg, Carrot ₹60/kg, Paneer ₹380/kg,
Butter ₹500/kg, Ghee ₹700/kg, Fresh cream ₹400/litre (store as 400, unit litre),
Curd ₹80/kg, Milk ₹60/litre, Chicken ₹220/kg, Mutton ₹600/kg,
Eggs ₹8/piece (unit: piece), Refined oil ₹150/litre, Mustard oil ₹180/litre,
Basmati rice ₹120/kg, Urad dal ₹140/kg, Chana dal ₹100/kg, Toor dal ₹130/kg,
Maida ₹45/kg, Atta ₹50/kg, Besan ₹80/kg, Cumin ₹400/kg,
Coriander powder ₹200/kg, Turmeric ₹300/kg, Red chilli powder ₹250/kg,
Garam masala ₹600/kg, Kasuri methi ₹800/kg, Cashew ₹900/kg,
Almond ₹1200/kg, Sugar ₹45/kg, Salt ₹25/kg, Tomato puree tin ₹120/kg

These are reference prices — owners will update their own.
```

**VERIFY:** SQL is valid. RLS policies exist on all tables.

---

### STEP 1.7 — Zustand stores

```
Create three Zustand stores:

1. src/stores/restaurantStore.ts
   State: restaurant (Restaurant | null), isLoading, error
   Actions: setRestaurant, clearRestaurant, fetchRestaurant(ownerId)
   fetchRestaurant calls the Supabase query from queries.ts

2. src/stores/ingredientStore.ts
   State: ingredients (Ingredient[]), isLoading, lastUpdated
   Actions: setIngredients, updateIngredientPrice(id, newPrice), fetchIngredients(restaurantId)
   updateIngredientPrice: updates local state AND writes to Supabase AND logs to price_history AND checks for spike (>= 15% change) — stores spike events in a spikes array

3. src/stores/recipeStore.ts
   State: recipes (Recipe[]), recipeIngredients (Record<string, RecipeIngredient[]>), isLoading
   Actions: setRecipes, fetchRecipes(restaurantId), fetchRecipeIngredients(recipeId)
   
   Also expose a selector: getMarginForRecipe(recipeId) that uses calculateMargin from costCalculator.ts — this is the single source of truth for margins. Never compute margins anywhere else in the app.

All stores use persist middleware from zustand/middleware to cache to localStorage with a 'kitcheniq-' prefix.
```

**VERIFY:** Stores import without error. getMarginForRecipe returns a MarginResult.

---

### STEP 1.8 — Router and app shell

```
Replace src/App.tsx with the full router setup using React Router v6 and Framer Motion page transitions.

Routes to define (all screens — some will be placeholder components for now):
/ → LoadingScreen
/login → SplashScreen  
/otp → OtpScreen
/setup → RestaurantSetupScreen
/onboarding/import → MenuImportScreen
/onboarding/parse → AiParserScreen
/onboarding/ingredients → IngredientPickerScreen
/dashboard → DashboardScreen
/recipes → RecipeListScreen
/recipes/new → AddRecipeScreen
/recipes/:id → RecipeDetailScreen
/recipes/:id/edit → EditRecipeScreen
/recipes/:id/nutrition → NutritionScreen
/ingredients → IngredientManagerScreen
/ingredients/:id → IngredientDetailScreen
/insights → InsightsScreen
/alerts/:id → AlertDetailScreen
/settings → SettingsScreen

Implement AnimatePresence with spring page transitions:
- Incoming: x: '100%' → x: 0, spring stiffness 380, damping 30, mass 0.8
- Outgoing: scale: 0.94, opacity: 0
- Each page wrapped in a motion.div with position fixed, inset 0, overflow auto, background #FFFAF5

Protect all routes except /login, /otp, /setup, /onboarding/* — redirect to /login if no Supabase session.

Create placeholder screen components in src/screens/ for each route — just a div with the route name so we can navigate during development. The real screens come in later phases.

TanStack Query: wrap the app in QueryClientProvider with a QueryClient that has staleTime of 5 minutes and retry of 1.
```

**VERIFY:** All routes navigate without crashing. Page transition animation plays between routes.

---

---

# PHASE 2 — AUTH SCREENS
## ~1 day

---

### STEP 2.1 — DarkHeader component

```
Create src/components/ui/DarkHeader.tsx — this component appears on EVERY screen. Get it exactly right.

Props interface:
- title: string (required)
- subtitle?: string
- showBack?: boolean
- breadcrumb?: string  
- rightElement?: React.ReactNode
- children?: React.ReactNode

The component renders a div with bg #0D0A14, px-4 pt-4 pb-5, relative, overflow-hidden.

Inside, absolutely positioned atmospheric elements (pointer-events none on all):
1. Primary saffron glow: top -50px, right -40px, 220×220px circle, radial-gradient rgba(232,99,10,0.28)→rgba(232,99,10,0.10)→transparent, animation: breathe 4s ease-in-out infinite
2. Secondary saffron halo: top -20px, right -10px, 120×120px circle, radial-gradient rgba(245,166,35,0.14)→transparent
3. Purple counter-glow: bottom -20px, left -10px, 100×100px circle, radial-gradient rgba(124,58,237,0.10)→transparent
4. Spice dot 1: top 10px right 26px, 2.5×2.5px circle, #F5A623, opacity 0.9, animation drift1 4s
5. Spice dot 2: top 22px right 13px, 2×2px circle, #E8630A, opacity 0.7, animation drift2 5s
6. Spice dot 3: top 7px right 50px, 2×2px circle, #F5A623, opacity 0.55, animation drift3 6s
7. Spice dot 4: bottom 12px right 36px, 2×2px circle, #F5A623, opacity 0.4, animation drift1 7s

Content (relative, above glows):
- If showBack: back button with ArrowLeft (size 14, strokeWidth 1.5) and breadcrumb text in white/40, 9px
- Title: white, 15px, font-semibold, tracking-tight
- Subtitle: white/36, 9px, mt-0.5
- children rendered below subtitle

Use useNavigate for the back button.
```

**VERIFY:** Component renders on a test page. All glow layers visible. Particles animate. Back button navigates.

---

### STEP 2.2 — Core UI components

```
Create all shared UI components. Each in its own file in src/components/ui/.

Button.tsx
- Props: variant ('primary' | 'ghost'), fullWidth, + all ButtonHTMLAttributes
- Primary: bg #7C3AED, text white, font-bold, 11px, px-4 py-2.5, rounded-[10px], box-shadow 0 4px 16px rgba(124,58,237,0.3)
- Ghost: border #EDE8F5, text #1A1A1A, bg transparent
- Both: whileTap scale 0.96 opacity 0.85, spring stiffness 500 damping 30
- disabled: opacity 50%

Card.tsx
- Props: onClick?, className?, children, + HTMLAttributes
- bg white, rounded-[14px], border 0.5px #EDE8F5, p-3
- If onClick: whileTap scale 0.97 opacity 0.85, spring stiffness 500 damping 30, cursor-pointer

StatCard.tsx
- Props: status (MarginStatus), value (number)
- Healthy: bg #003D20, number color #00DC82, border rgba(0,220,130,0.4)
- Watch: bg #3D2000, number color #FBB924, border rgba(251,185,36,0.4)
- Critical: bg #3D0008, number color #FF505F, border rgba(255,80,95,0.4)
- Layout: label 6px uppercase tracking 0.05em, number 20px font-bold, border-radius 8px, padding 7px 6px, border 0.5px

MarginBar.tsx
- Props: percent (number)
- Clamp 0–100. Color: >=50 #00DC82, >=30 #FBB924, else #FF505F
- Track: #F5F0FA. Height 3px. Border-radius 999px.
- Fill width transition: 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)

Skeleton.tsx
- Props: width (string|number, default '100%'), height (number, default 48), radius (number, default 10)
- Background: linear-gradient 90deg #F0EBF8 25% → #E8E0F5 50% → #F0EBF8 75%
- background-size: 200% 100%, animation: shimmer 1.5s infinite

StatusBadge.tsx
- Props: status (MarginStatus)
- Healthy: bg #F0FBF5 text #00A36C
- Watch: bg #FFF8EC text #F59E0B
- Critical: bg #FFF5F6 text #FF505F
- Style: 9px, font-semibold, px-2 py-0.5, rounded-full

Logo.tsx
- Props: size (number, default 22)
- Purple rounded square (radius 24% of size) with A-shaped SVG path in white
- box-shadow 0 4px 12px rgba(124,58,237,0.35)

AiTipCard.tsx
- Props: tip (string), isLoading (boolean)
- If isLoading: show Skeleton
- If no tip: render nothing (never show error)
- bg #F5F0FA, rounded-[14px], p-3
- Small Sparkles icon from lucide in #7C3AED
- Tip text in #5B21B6, 11px

BottomNav.tsx
- 5 tabs: Home (/dashboard), Recipes (/recipes), Ingredients (/ingredients), Insights (/insights), Settings (/settings)
- bg white, border-top 0.5px #EDE8F5, fixed bottom 0, max-width 430px, width 100%
- Active: #7C3AED. Inactive: #BBBBBB.
- Icons from Lucide, size 18, strokeWidth 1.5
- Label: 9px. Tap: spring scale 0.92.
- Use useLocation to detect active tab.
```

**VERIFY:** Render all components on a test page. StatCard shows correct tinted backgrounds. MarginBar animates on mount.

---

### STEP 2.3 — Splash and login screen

```
Build src/screens/SplashScreen.tsx at route /login.

This screen has no DarkHeader (it IS the splash). Full screen bg #0D0A14.

Layout (centered, full viewport):
- Same atmospheric glow as DarkHeader but full screen — primary glow top-right, secondary bottom-left
- Logo component (size 48) centered, with a gentle breathe animation
- App name "KitchenIQ" in white, 28px, font-bold, letter-spacing -0.5px, below logo
- Tagline: "Your restaurant's AI brain" in white/50, 12px
- Gap, then email input field:
  - placeholder "Enter your email"
  - bg rgba(255,255,255,0.08), border rgba(255,255,255,0.12), text white, rounded-[10px], px-4 py-3, 13px
  - focus: border rgba(124,58,237,0.6)
- Primary Button "Get started →" below input, full width
- On submit: call supabase.auth.signInWithOtp({ email }) then navigate to /otp
- Show loading state on button while request is in flight
- Small "Beta — Free" badge in bottom corner: bg rgba(124,58,237,0.2), text #A78BFA, 9px, rounded-full, px-2 py-1

Validate email with Zod before submitting. Show inline error "Enter a valid email" if invalid.
```

**VERIFY:** Email validation works. OTP request fires (check Supabase dashboard). Navigation to /otp happens.

---

### STEP 2.4 — OTP verification screen

```
Build src/screens/OtpScreen.tsx at route /otp.

DarkHeader with title "Check your email", subtitle "Enter the 6-digit code we sent you", showBack true.

Body (bg #FFFAF5, px-4 pt-6):
- 6 individual digit input boxes in a row
  - Each: 44×52px, bg white, border 0.5px #EDE8F5, rounded-[10px], text-center, 24px font-bold
  - Focused: border #7C3AED
  - Auto-advance to next box on digit entry
  - Backspace on empty box focuses previous box
  - Paste support: pasting 6 digits fills all boxes
- "Verify code" Button below, full width, primary
- "Resend code" ghost button with 60s countdown timer: "Resend in 54s" → "Resend code"
- On verify: call supabase.auth.verifyOtp({ email, token, type: 'email' })
  - Success: check if restaurant exists for this user
    - If yes → navigate to /dashboard
    - If no → navigate to /setup
  - Error: shake animation on the input boxes, show "Incorrect code" below

Get the email from location state or from a store. If no email found, redirect to /login.
```

**VERIFY:** 6-digit input works with keyboard. Auto-advance works. Paste fills all boxes. Resend countdown works.

---

---

# PHASE 3 — ONBOARDING
## ~3–4 days (highest risk — test thoroughly)

---

### STEP 3.1 — Restaurant setup screen

```
Build src/screens/RestaurantSetupScreen.tsx at route /setup.

DarkHeader: title "Set up your restaurant", subtitle "Takes 30 seconds".

Body (px-4 pt-6, space-y-4):
Only 3 fields — never more:
1. Restaurant name — text input, placeholder "e.g. Sharma's Kitchen"
2. City — select dropdown: Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Pune, Kolkata, Other
3. Cuisine type — select: North Indian, South Indian, Chinese, Continental, Multi-cuisine, Other

Optional (collapsible "Add FSSAI number (optional)" link):
- FSSAI input appears when tapped, can be skipped

"Let's go →" Button, full width, primary, at bottom.

Validation with react-hook-form + Zod: name (min 2 chars), city (required), cuisine_type (required).

On submit:
- Create restaurant record in Supabase (restaurants table)
- Store in restaurantStore
- Navigate to /onboarding/import

Show a Skeleton placeholder while saving.

Never show an empty screen — if this is a returning user who already has a restaurant, redirect to /dashboard immediately on mount.
```

**VERIFY:** Form validates. Restaurant created in Supabase. restaurantStore has data after submit.

---

### STEP 3.2 — Menu photo import screen

```
Build src/screens/MenuImportScreen.tsx at route /onboarding/import.

DarkHeader: title "Import your menu", subtitle "Take a photo of your menu — AI will read it".

Body (px-4 pt-6):

State 1 — Upload prompt (default):
- Large dashed upload zone (full width, 180px tall, rounded-[14px], border 1.5px dashed #EDE8F5)
- Camera icon (Lucide, size 32, #7C3AED) centered
- "Take a photo of your menu" in #1A1A1A, 13px, text-center
- "or upload a file" in #888888, 11px
- Hidden file input accepting image/*, application/pdf
- Tap anywhere on zone triggers file input
- Also show "Skip for now →" ghost button below — navigates to /onboarding/parse

State 2 — Processing (after file selected):
- Show uploaded image preview (if image, not PDF)
- Shimmer skeleton below: "Reading your menu..." with a pulsing Sparkles icon #7C3AED
- This calls the Supabase Edge Function 'menu-import' (stub for now)
- The Edge Function receives the base64 image and returns ImportedDish[]
- Show a progress message that cycles: "Finding dishes..." → "Reading prices..." → "Almost done..."

State 3 — Review results:
- "We found 34 dishes. Does this look right?" header
- Scrollable list of ImportedDish cards:
  - Each card: dish name (editable inline), category chip, selling price (editable)
  - If confidence < 0.7: amber border + "Please review" badge
  - Swipe left or X button to remove a dish
  - "+ Add dish" button at bottom of list
- "Looks good →" primary Button at bottom
- On confirm: save all dishes as Recipe records with selling_price, navigate to /onboarding/ingredients

Max 5 photos per session, max 100 dishes. If more than 100, show a warning and trim.
```

**VERIFY:** File upload works. Stub Edge Function returns mock dishes. Review state shows dishes. Confirm saves to recipes table.

---

### STEP 3.3 — Edge Function: menu-import

```
Create supabase/functions/menu-import/index.ts.

This Edge Function receives a POST with:
{
  imageBase64: string,   // base64-encoded image or PDF
  mediaType: string,     // 'image/jpeg' | 'image/png' | 'application/pdf'
  restaurantId: string,
  cuisineType: string,
  city: string
}

It calls the Anthropic API (claude-sonnet-4-6) with vision:
- Pass the image as a base64 image block
- System prompt:
  "You are a menu reader for Indian restaurants. Extract every dish from the menu image. Return ONLY valid JSON with no other text. Format: { dishes: [{ name: string, category: string, selling_price: number, confidence: number }] }. Categories should be one of: Starters, Main Course, Breads, Rice, Dal, Paneer, Chicken, Mutton, Seafood, Desserts, Beverages, Soups. If price is not visible, set selling_price to 0. Set confidence 0-1 based on how clearly you could read the dish name and price."
- User message: "Extract all dishes from this menu image."

Parse the JSON response. For each dish:
- confidence < 0.7: set needs_review = true
- selling_price === 0: set needs_review = true

Return the ImportedDish[] array.

Error handling:
- If Anthropic API fails: return 503 with { error: 'import_failed', fallback: true }
- If JSON parse fails: attempt to extract partial data, return what was found with all confidence = 0.5
- Never return a 500 that crashes the client

The API key must come from Deno.env.get('ANTHROPIC_API_KEY') — never hardcode it.
Set the ANTHROPIC_API_KEY secret in Supabase dashboard.
```

**VERIFY:** Edge Function deploys. Test with a real menu photo. Dishes extracted with reasonable accuracy.

---

### STEP 3.4 — AI text parser screen (fallback onboarding)

```
Build src/screens/AiParserScreen.tsx at route /onboarding/parse.

DarkHeader: title "Add your first dish", subtitle "Type it naturally — AI will understand".

Body (px-4 pt-6):
- Large text area: placeholder "e.g. Dal Makhani — urad dal, kidney beans, butter, cream, tomatoes, spices. Serves 1 portion."
- 120px tall, bg #FFFAF5, border 0.5px #EDE8F5, rounded-[14px], focus border #7C3AED, 13px, p-3
- "Parse with AI →" Button below, primary
- On submit: call Edge Function 'ai-recipe-parser' with the text
- Show a loading Skeleton while waiting
- Result renders as an editable RecipeCard showing extracted ingredients and estimated costs
- "Save dish" Button to confirm — saves Recipe + RecipeIngredients to Supabase
- "Add another dish" and "Go to dashboard →" options after first save

Below the textarea, show 3 example tappable chips:
"Dal Makhani" | "Butter Chicken" | "Paneer Tikka"
Tapping fills the textarea with a sample description.

"Skip and go to dashboard →" ghost button at bottom.
```

**VERIFY:** Text input works. Edge Function (stub) returns recipe data. Recipe saves to DB.

---

### STEP 3.5 — Edge Function: ai-recipe-parser

```
Create supabase/functions/ai-recipe-parser/index.ts.

Receives POST:
{
  text: string,        // owner's plain English description
  cuisineType: string,
  city: string,
  restaurantId: string
}

Calls claude-sonnet-4-6 with:
System: "You are a recipe cost analyst for Indian restaurants. Parse the dish description and return ONLY valid JSON. Format: { name: string, category: string, estimated_selling_price: number, ingredients: [{ name: string, quantity: number, unit: 'kg'|'gram'|'litre'|'ml'|'piece'|'dozen', estimated_price_per_kg: number }], serves: number, wastage_percent: number, overhead_percent: number }. Base prices on typical {city} mandi prices. wastage_percent default 10, overhead_percent default 20."
User: the text from the request.

Return the parsed JSON directly to the client.

If the ingredient name matches one from the pre-loaded library, use that ingredient's current price instead of the estimate. Pass the existing ingredient list to the prompt.
```

**VERIFY:** Parses "Dal Makhani with butter, cream, urad dal" correctly. Returns structured recipe data.

---

### STEP 3.6 — Ingredient picker screen

```
Build src/screens/IngredientPickerScreen.tsx at route /onboarding/ingredients.

DarkHeader: title "Set your ingredient prices", subtitle "Update from what you pay at the mandi".

Show the full 40-ingredient library pre-loaded. Owner selects the ones they use and sets their local price.

Layout:
- Search bar at top (filters list in real time)
- Grouped list by category: Vegetables, Dairy, Proteins, Oils, Grains, Spices, Nuts
- Each ingredient row: name on left, price input on right (pre-filled with library default), unit label
- Checkbox/tick on left — ticked = this restaurant uses this ingredient
- Price input: numeric keyboard, ₹ prefix, editable

Ticked ingredients get saved to the restaurant's ingredients table.
Prices default to library values but are fully editable.

"Save and go to dashboard →" Button at bottom, full width.

On save: upsert all ticked ingredients into Supabase, load dashboard.

"Skip for now" ghost button — can always update prices later from the Ingredient Manager.
```

**VERIFY:** Search filters list. Selecting ingredients saves to Supabase. Dashboard loads after save.

---

---

# PHASE 4 — CORE SCREENS
## ~3–4 days

---

### STEP 4.1 — Dashboard screen

```
Build src/screens/DashboardScreen.tsx at route /dashboard. This is the most important screen.

DarkHeader: 
- Left: Logo (size 22) + "KitchenIQ" text
- Right: notification bell icon (Lucide, size 18, strokeWidth 1.5)
- No back button on dashboard

Body (bg #FFFAF5, px-4 pt-4 pb-24 — pb-24 for BottomNav):

Section 1 — AI Summary card:
- Card component, bg white, rounded-[14px], border 0.5px #EDE8F5, p-3
- Sparkles icon (size 14, #7C3AED) + "AI insight" label (9px, #7C3AED) in a row
- 2-line summary text (12px, #1A1A1A): loaded async from ai-insights cache
- While loading: show 2 Skeleton lines
- If no insight yet: "Calculating your menu performance..." with a shimmer

Section 2 — Health stat blocks (3 in a row):
- Use StatCard component
- Calculate counts from all recipes: how many healthy / watch / critical
- Numbers animate from 0 to final value on mount using Framer Motion (800ms spring)
- Tap any stat block → navigate to /recipes with that status filter applied

Section 3 — Alert strip (conditional):
- Only show if any ingredient has changed ≥15% since last update
- Amber background (#FFF8EC), full width, rounded-[10px], p-3
- AlertTriangle icon (14px, #F59E0B) + alert text
- Tap → navigate to /alerts/:id
- Dismiss X button on right

Section 4 — Dish list header:
- "Your menu" label (12px, #888888) + "Sort by: Worst first" right-aligned (11px, #7C3AED, tappable)

Section 5 — Dish cards (sorted by margin, worst first):
- Each: Card component with:
  - Row 1: dish name (13px, bold), category chip, status badge
  - Row 2: selling price (12px, #888888), margin % in status colour (13px, bold)
  - MarginBar below (full width)
  - Row 3: "Cost: ₹XX" (11px, #888888), profit per dish in status colour (11px)
- Tap card → navigate to /recipes/:id
- While loading: show 4 Skeleton cards

Show BottomNav at bottom.

Load data: useQuery to fetch all recipes + ingredients, compute margins live using getMarginForRecipe from recipeStore.
Pull-to-refresh: re-fetches all data.
```

**VERIFY:** Stat blocks count correctly. Dish cards show correct margins. Worst-first sort works. Skeleton shows during load.

---

### STEP 4.2 — Edge Function: ai-dashboard-summary

```
Create supabase/functions/ai-dashboard-summary/index.ts.

Receives POST: { restaurantId: string, dishes: DishSummary[] }

Builds a plain English 1–2 sentence summary like:
"2 dishes crossed into critical margin today. Your Dal Makhani and Shahi Paneer need attention."

Call claude-sonnet-4-6:
System: "You are an AI advisor for an Indian restaurant owner. Write a 1-2 sentence plain English insight about their menu performance right now. Be specific — name actual dishes. Be direct. No marketing language. Example: '3 dishes are losing money. Dal Makhani has the worst margin at 18% — raise the price or cut cream.'  Return ONLY the insight text, no JSON, no formatting."
User: JSON summary of all dishes with their margins and statuses.

Cache the result in ai_insights table for 6 hours. On the next call within 6 hours, return the cached version without calling Claude.

Return: { summary: string, cached: boolean }
```

**VERIFY:** Returns a sensible summary. Second call within 6h returns cached version.

---

### STEP 4.3 — Recipe list screen

```
Build src/screens/RecipeListScreen.tsx at route /recipes.

DarkHeader: title "Your menu", subtitle "{N} dishes"
rightElement: Plus icon button → navigate to /recipes/new

Body (px-4 pt-4 pb-24):

Filter row:
- Horizontal scroll chips: All | Healthy | Watch | Critical | [category names]
- Active chip: bg #7C3AED, text white. Inactive: bg white, border #EDE8F5, text #1A1A1A
- If navigated from dashboard stat block, pre-select that filter

Search bar: text input that filters dish list in real time.

Dish list: same card design as dashboard but slightly more detail:
- Show wastage%, overhead%, serves count in a subtle row (10px, #888888)
- Each card tappable → /recipes/:id

Empty state (no dishes): 
- "No dishes yet" illustration (simple SVG plate icon)
- "Add your first dish" Button → /recipes/new

BottomNav at bottom.
```

**VERIFY:** Filter chips work. Search filters in real time. Navigate to /recipes/new from + button.

---

### STEP 4.4 — Recipe detail screen

```
Build src/screens/RecipeDetailScreen.tsx at route /recipes/:id.

DarkHeader:
- showBack: true, breadcrumb: "Menu"
- title: recipe name
- rightElement: Edit button → /recipes/:id/edit

Body (px-4 pt-4 pb-24):

Section 1 — Margin hero:
- Large margin number: 64.3% in status colour, 36px, bold, count-up animation on mount
- Status badge below
- Profit per dish: "₹182 profit per plate" in status colour, 13px
- Total cost: "Costs ₹98 to make" in #888888, 11px
- MarginBar (full width, 6px height on this screen)

Section 2 — AI tip card (AiTipCard component):
- Loads async from ai-tips table
- If not cached or expired: triggers ai-tip Edge Function in background
- Show Skeleton while loading, nothing if error

Section 3 — Pricing info:
- Card with: Selling price, Cost breakdown (raw / wastage / overhead as mini bars)

Section 4 — Ingredients:
- "Ingredients" label (12px, #888888)
- Each ingredient: name, quantity+unit, cost contribution (₹ and %)
- Sorted by cost contribution, highest first

Section 5 — Actions:
- "Generate nutrition label" ghost button → /recipes/:id/nutrition
- "Edit recipe" ghost button → /recipes/:id/edit

BottomNav at bottom.

Fetch recipe + recipeIngredients from store. Compute margin live.
```

**VERIFY:** Margin animates on mount. AI tip loads (or shows nothing on failure). Cost breakdown is correct.

---

### STEP 4.5 — Edge Function: ai-tip

```
Create supabase/functions/ai-tip/index.ts.

Receives POST: { recipeId: string, recipe: Recipe, ingredients: RecipeIngredient[], margin: MarginResult }

Only fires when:
1. margin.status is 'critical' or 'watch'
2. No cached tip exists in ai_tips table, or existing tip is expired (>24h)

Call claude-sonnet-4-6:
System: "You are a restaurant profit advisor. Give one specific, actionable tip to improve the margin on this dish. Be concrete — mention actual rupee amounts and specific ingredients. Max 2 sentences. No generic advice. Example: 'Reduce fresh cream from 100ml to 70ml to save ₹12 per plate, lifting margin from 22% to 31%.'"
User: Recipe name, selling price, each ingredient with quantity + cost, current margin.

Save result to ai_tips table with expires_at = now() + 24 hours.

If API fails or takes > 3s: return { tip: null } — the UI shows nothing. Never show an error.
```

**VERIFY:** Tip is dish-specific with real numbers. Cached correctly. Second call within 24h returns cache.

---

---

# PHASE 5 — INPUT SCREENS
## ~2–3 days

---

### STEP 5.1 — Add recipe screen

```
Build src/screens/AddRecipeScreen.tsx at route /recipes/new.

DarkHeader: title "Add a dish", showBack true, breadcrumb "Menu"

Body (px-4 pt-4 pb-32):
Use react-hook-form + Zod throughout.

Field 1: Dish name — text input
Field 2: Category — select (same categories as import)
Field 3: Selling price — numeric input, ₹ prefix
Field 4: Serves — numeric input, default 1
Field 5: Wastage % — numeric input, default 10, range 0–50
Field 6: Overhead % — numeric input, default 20, range 0–100

Ingredient section:
- "Ingredients" label + "Add ingredient" button
- Each added ingredient shows as a row: ingredient name, quantity, unit, cost (calculated live)
- Tapping "Add ingredient" opens the bottom sheet (IngredientBottomSheet)

Live margin preview:
- As owner fills in data, show a live margin preview card at the bottom:
  - Current margin %, status colour, profit per dish
  - Updates on every change to price or ingredients
  - Uses calculateMargin from costCalculator.ts
  - Show "Add ingredients to see margin" if no ingredients yet

"Save dish" Button at bottom, full width, primary.

On save: create Recipe + RecipeIngredients in Supabase, update recipeStore, navigate to /recipes/:newId.
```

**VERIFY:** Live margin updates as fields change. Bottom sheet opens. Recipe saves with ingredients.

---

### STEP 5.2 — Ingredient bottom sheet

```
Create src/components/ui/IngredientBottomSheet.tsx.

A modal bottom sheet that slides up from the bottom (Framer Motion: y: '100%' → y: 0, spring stiffness 400 damping 35).
Dark overlay behind (bg rgba(0,0,0,0.4), tap to dismiss).
Drag handle at top (32×4px, bg #EDE8F5, rounded, centered).

Content:
- "Add ingredient" header (14px, bold)
- Search input (filters the ingredient list in real time)
- Scrollable list of all restaurant ingredients
  - Each row: ingredient name, current price, unit
  - Tap to select
- After selecting ingredient:
  - Quantity input with unit selector
  - Shows live cost for that quantity
  - "Add to recipe" button
- "Create new ingredient" link at bottom — navigates to /ingredients with a "new" param

Props: isOpen, onClose, onAdd(ingredientId, quantity, unit), restaurantId

Never use a <select> for the unit — use tappable pill chips (kg / gram / litre / ml / piece / dozen).
```

**VERIFY:** Bottom sheet animates in/out. Search filters. Ingredient adds to recipe form.

---

### STEP 5.3 — Edit recipe screen

```
Build src/screens/EditRecipeScreen.tsx at route /recipes/:id/edit.

Same as AddRecipeScreen but pre-populated with existing data.

Additional features:
- "Delete dish" destructive button at bottom (red, ghost variant)
  - Confirmation: "Are you sure? This cannot be undone." — a simple inline confirm, no modal
  - On confirm: delete Recipe from Supabase, navigate to /recipes
- "Duplicate dish" link — creates a copy with "Copy of" prefix

On save: update Recipe + RecipeIngredients in Supabase (delete old recipe_ingredients, insert new ones), update recipeStore, navigate to /recipes/:id.
```

**VERIFY:** Form pre-populates. Save updates correctly. Delete removes dish.

---

### STEP 5.4 — Ingredient manager screen

```
Build src/screens/IngredientManagerScreen.tsx at route /ingredients.

DarkHeader: title "Ingredients", subtitle "Last updated: X days ago"
rightElement: Plus button → creates new ingredient inline

Body (px-4 pt-4 pb-24):

Alert banner (conditional):
- "Some prices haven't been updated in 7+ days" in amber, dismissible

Search + filter row: text search, filter by category chips.

Ingredient list (sorted by last_updated, oldest first — show staleness):
- Each card (Card component):
  - Ingredient name (13px, bold)
  - Current price (₹XX/kg or per unit), last updated date (relative: "3 days ago")
  - Stale indicator: if last_updated > 7 days, show amber dot
  - Tap → /ingredients/:id

FAB-style "Update all prices" button — not MVP, placeholder only.

BottomNav at bottom.
```

**VERIFY:** Ingredients list loads. Stale indicators show. Tap navigates to detail.

---

### STEP 5.5 — Ingredient detail and price history screen

```
Build src/screens/IngredientDetailScreen.tsx at route /ingredients/:id.

DarkHeader: title = ingredient name, showBack true, breadcrumb "Ingredients"

Body (px-4 pt-4 pb-24):

Section 1 — Current price:
- Large price display: "₹60/kg" — 28px, bold, #1A1A1A
- "Last updated 3 days ago" — 11px, #888888
- Edit button: tapping turns the price display into an editable input
  - "Save" button appears
  - On save: call upsertIngredientPrice from ingredientStore
    - Logs to ingredient_price_history
    - Checks for spike (≥15% change) — if spike, creates an alert entry
    - Updates all recipe margins automatically (they recalculate live)
  - "Updated" confirmation flash

Section 2 — Price history chart:
- Recharts LineChart showing last 10 price changes
- Line colour: same status colour logic as MarginBar
- X axis: relative dates ("3d ago", "1w ago")
- Y axis: ₹ prices
- If < 2 data points: "Not enough history yet" placeholder

Section 3 — Affected dishes:
- "Dishes using this ingredient" label
- List of Recipe cards that include this ingredient
- Show current margin for each
- Tap → /recipes/:id

Section 4 — Spike info (conditional):
- Only show if this ingredient triggered a spike alert
- Alert card with AI recommendation
```

**VERIFY:** Price edit saves to DB and history. Chart renders with history data. Affected dishes list correct.

---

---

# PHASE 6 — AI FEATURES
## ~3–4 days

---

### STEP 6.1 — Price spike detection system

```
In src/stores/ingredientStore.ts, enhance the updateIngredientPrice action to fully implement spike detection.

When a price is saved:
1. Calculate changePercent = ((newPrice - oldPrice) / oldPrice) * 100
2. If Math.abs(changePercent) >= 15:
   a. Find all RecipeIngredients that use this ingredient
   b. For each affected recipe: calculate old margin and new margin
   c. Find recipes that changed status (e.g. Watch → Critical)
   d. Create an entry in the ai_insights table: insight_type 'spike_alert', with the data payload
   e. Trigger the ai-spike-recommendations Edge Function (fire-and-forget, don't await)
   f. Set a flag in the store: activeSpikeAlerts (array of PriceSpike)

The alert strip on the dashboard reads activeSpikeAlerts from the store.
Alerts persist until the owner dismisses them (stores dismissed IDs in localStorage).
```

**VERIFY:** Update tomato price by 20%. Alert strip appears on dashboard. Affected recipes show changed margins.

---

### STEP 6.2 — Edge Function: ai-spike-recommendations

```
Create supabase/functions/ai-spike-recommendations/index.ts.

Receives POST: { spike: PriceSpike, restaurantId: string }

For each affected recipe, generate a specific recommendation:
Call claude-sonnet-4-6 once with all affected recipes in the prompt:

System: "You are a restaurant profit advisor. An ingredient price has spiked. For each affected dish, give ONE specific action in plain English. Format your response as JSON: { recommendations: [{ recipe_id: string, action: string }] }. Actions must be specific: name the dish, name the ingredient, give rupee amounts. Example action: 'Raise price to ₹320 or reduce tomato from 200g to 140g per plate to restore margin above 40%.'"

Save recommendations to ai_insights table.
Return them to the client immediately.

The alert detail screen at /alerts/:id reads these recommendations.
```

**VERIFY:** Spike alert shows specific dish-level recommendations with real numbers.

---

### STEP 6.3 — Alert detail screen

```
Build src/screens/AlertDetailScreen.tsx at route /alerts/:id.

DarkHeader: title "Price alert", subtitle = ingredient name + change, showBack true

Body (px-4 pt-4):

Alert header card (amber tint):
- Ingredient name
- Price change: "₹40 → ₹58/kg (+45%)"
- Date of change

Affected dishes section:
- "4 dishes affected — 2 now critical" summary
- For each affected recipe:
  - Card with dish name, old margin → new margin (with arrow), status badge
  - AI recommendation below in #5B21B6 italic text
  - "Update price" and "View dish" buttons

"Dismiss alert" ghost button at bottom.
On dismiss: mark ai_insights record as dismissed, remove from activeSpikeAlerts store, navigate back.
```

**VERIFY:** Alert shows correct before/after margins. AI recommendations are dish-specific. Dismiss works.

---

### STEP 6.4 — AI insights screen

```
Build src/screens/InsightsScreen.tsx at route /insights.

DarkHeader: title "AI insights", subtitle "Updated weekly"

Body (px-4 pt-4 pb-24):

Three sections, each collapsible:

1. "Reprice" — dishes that have been critical for >7 days
   - For each: "Raise [dish] from ₹220 to ₹260" Card
   - Shows margin at current price vs margin at suggested price
   - "Apply" ghost button (updates selling_price, recalculates margin)

2. "Promote" — dishes with highest margin that could sell more
   - "Push [dish] more — it's your highest margin dish at 74%"
   - Tap to see more detail on that recipe

3. "Consider removing" — dishes critical for >30 days
   - "Every plate of [dish] loses you ₹22"
   - "Remove" button → routes to /recipes/:id/edit for deletion

Load insights from ai_insights table (filtered by restaurant, not dismissed).
If no insights: "No urgent actions right now. Your menu is healthy." placeholder.
"Refresh insights" ghost button triggers ai-menu-optimisation Edge Function.

BottomNav at bottom.
```

**VERIFY:** Insights load from DB. Sections collapse/expand. Apply reprice updates selling_price.

---

### STEP 6.5 — Edge Function: ai-menu-optimisation

```
Create supabase/functions/ai-menu-optimisation/index.ts.

Receives POST: { restaurantId: string }

Fetches all recipes + current margins from the DB.
Calls claude-sonnet-4-6:

System: "You are a menu optimisation advisor for an Indian restaurant. Analyse the menu and return specific actions as JSON only: { insights: [{ type: 'reprice'|'promote'|'remove', recipe_id: string, message: string, suggested_price?: number, reason: string }] }. Rules: reprice only if margin < 30% for > 7 days. Promote only the top 2 margin dishes. Remove only if margin < 30% for > 30 days. Always include the dish name and specific ₹ amounts in message."

Upsert results into ai_insights table (replace existing non-dismissed insights for this restaurant).
Return the new insights.

This function is called:
1. When owner taps "Refresh insights"
2. Automatically once per week (Supabase cron — configure separately)
```

**VERIFY:** Returns correct insight types. Reprice suggestions have specific price targets.

---

---

# PHASE 7 — NUTRITION LABEL
## ~2 days

---

### STEP 7.1 — Nutrition screen

```
Build src/screens/NutritionScreen.tsx at route /recipes/:id/nutrition.

DarkHeader: title "Nutrition label", subtitle = recipe name, showBack true

Body (px-4 pt-4 pb-24):

If nutrition data not yet calculated:
- "Generate nutrition label" section
- Sparkles icon, short explanation
- "Calculate nutrition" primary Button
- On tap: call ai-nutrition Edge Function, show Skeleton while loading

If nutrition data exists (from nutrition_data table):
Section 1 — FSSAI label preview:
- White card, full width, styled exactly like an FSSAI nutrition label
- Header: "Nutrition information (per serving of 1 portion)"
- Table rows: Energy, Protein, Total carbohydrate (of which sugars), Total fat (of which saturated fat), Dietary fibre, Sodium
- Values formatted to 1 decimal place with units
- Footer: "% Daily values are based on 2000 kcal diet"
- If is_ai_estimate: small disclaimer "* Estimated by AI — verify with a nutritionist"

Section 2 — Dietary tags:
- Auto-detected tags as chips: Vegan / Jain / Gluten-free / High protein
- Each chip: icon + label, green bg

Section 3 — Export:
- "Download PDF" primary button — calls pdf generation
- "Save as image" ghost button
- "Share on WhatsApp" ghost button (wa.me deep link)

PDF filename format: [DishName]_NutritionLabel_KitchenIQ.pdf
```

**VERIFY:** Label renders with correct FSSAI layout. Tags auto-detect correctly. PDF downloads.

---

### STEP 7.2 — Edge Function: ai-nutrition

```
Create supabase/functions/ai-nutrition/index.ts.

Receives POST: { recipeId: string, recipe: Recipe, ingredients: RecipeIngredient[] }

First: look up IFCT 2017 data from ingredient_nutrition table for each ingredient.
For ingredients not in the table: use Claude to estimate.

Call claude-sonnet-4-6 for unknown ingredients only:
"Estimate the nutritional values per 100g for [ingredient name], an ingredient commonly used in Indian cooking. Return ONLY JSON: { energy_kcal: number, protein_g: number, carbs_g: number, sugars_g: number, fat_g: number, saturated_fat_g: number, fibre_g: number, sodium_mg: number }"

Calculate total nutrients per serving:
- For each ingredient: (quantity in grams / 100) × nutrient_per_100g
- Sum all ingredients
- Divide by serves

Detect dietary tags:
- Jain: onion, garlic, potato, carrot, beetroot in ingredient names
- Vegan: paneer, butter, ghee, cream, curd, milk, chicken, mutton, eggs
- Gluten-free: maida, wheat, atta, barley
- High protein: total protein > 25g

Set is_ai_estimate = true if any ingredient used Claude estimates.

Save to nutrition_data table (upsert).
Return the full NutritionData object.
```

**VERIFY:** Nutrition calculates correctly for a known dish. Dietary tags detect correctly.

---

---

# PHASE 8 — SETTINGS + POLISH
## ~2 days

---

### STEP 8.1 — Settings screen

```
Build src/screens/SettingsScreen.tsx at route /settings.

DarkHeader: title "Settings"

Body (px-4 pt-4 pb-24):

Section 1 — Restaurant:
- Restaurant name, city, cuisine type — tappable rows, each opens an inline edit
- FSSAI number — editable field

Section 2 — Plan:
- "Beta — Free" badge (bg rgba(124,58,237,0.15), text #7C3AED, rounded-full)
- "Full access during beta. Billing starts Month 3." in #888888, 11px
- Greyed out "₹499/month — Starter" with "Coming soon" badge

Section 3 — Data:
- "Export recipes as CSV" ghost button
- "Export ingredients as CSV" ghost button
- Both trigger CSV download from current store data

Section 4 — Account:
- "Sign out" destructive ghost button — calls supabase.auth.signOut(), clears stores, navigates to /login

Section 5 — About:
- App version, link to privacy policy (placeholder)

BottomNav at bottom.
```

**VERIFY:** CSV exports download correctly formatted files. Sign out clears session and redirects.

---

### STEP 8.2 — Performance and loading states audit

```
Audit every screen for the following and fix any gaps:

1. LOADING STATES: Every screen must show Skeleton components (not spinners, not "Loading...") while data fetches. Check: Dashboard, Recipe list, Recipe detail, Ingredient detail, Insights.

2. EMPTY STATES: Every list must have an empty state with an action. Check: Recipe list (no dishes), Ingredient list (no ingredients), Insights (no insights).

3. ERROR STATES: Network errors must show a gentle "Something went wrong — tap to retry" Card, never a crash. Wrap all screens in an error boundary.

4. SKELETON COUNT: The number of skeleton cards should match the expected number of real items (e.g., if the owner has 12 dishes, show 12 skeletons on first load).

5. OPTIMISTIC UPDATES: Price updates and recipe saves should update the UI immediately, then sync to Supabase. If Supabase fails, revert with a toast.

6. ANIMATION CONSISTENCY: Verify every Card has the whileTap spring. Every Button has the whileTap spring. Page transitions fire on all route changes.

7. ICON AUDIT: Verify every Lucide icon in the app has strokeWidth={1.5}. Search for all <* size= patterns and confirm.

8. COLOUR AUDIT: Verify no hardcoded hex values outside the design system. Search for # in JSX files. Only the colours from the design token list are allowed.

Fix all issues found before moving on.
```

**VERIFY:** No screen shows a blank state or spinner. Every tap gives immediate feedback.

---

### STEP 8.3 — Final integration test

```
Run through these complete user flows end to end and fix any broken navigation or data issues:

FLOW 1 — New owner, photo import:
/login → enter email → /otp → enter code → /setup → fill 3 fields → /onboarding/import → upload menu photo → review dishes → /onboarding/ingredients → pick ingredients and set prices → /dashboard

Verify: Dashboard shows stat blocks. Dish list populated. Margins calculated.

FLOW 2 — Returning owner daily use:
/login → auto-redirect to /dashboard → read AI summary → tap a critical dish → /recipes/:id → see margin, AI tip → tap edit → /recipes/:id/edit → change selling price → back → verify margin updated

FLOW 3 — Price update and spike:
/dashboard → BottomNav ingredients → /ingredients → tap Tomato → /ingredients/:id → change price from ₹60 to ₹90 → save → verify alert strip appears on /dashboard → tap alert → /alerts/:id → see affected dishes with AI recommendations

FLOW 4 — Nutrition label:
/recipes/:id → tap "Generate nutrition label" → /recipes/:id/nutrition → see FSSAI label → download PDF

Fix any navigation gaps, missing data propagation, or broken flows found.
```

**VERIFY:** All 4 flows complete without errors. Data persists across navigation.

---

---

# APPENDIX — EDGE FUNCTION DEPLOYMENT

```
Deploy all Edge Functions to Supabase:

supabase functions deploy menu-import
supabase functions deploy ai-recipe-parser
supabase functions deploy ai-dashboard-summary
supabase functions deploy ai-tip
supabase functions deploy ai-spike-recommendations
supabase functions deploy ai-menu-optimisation
supabase functions deploy ai-nutrition

Set secrets in Supabase dashboard:
supabase secrets set ANTHROPIC_API_KEY=your_key_here

Verify each function is accessible at:
https://[your-project].supabase.co/functions/v1/[function-name]

Test each with a curl request before connecting the UI.
```

---

# APPENDIX — WHAT IS NOT BUILT (DO NOT ADD)

The following are explicitly out of scope for this build. Do not build, reference, or stub these:
- Inventory management
- Swiggy / Zomato integration  
- WhatsApp CRM
- Multi-outlet support
- Agmarknet price sync
- Staff portal
- Supplier management
- Festival planner
- Hindi UI
- Voice input
- Native iOS/Android app

---

*End of KitchenIQ Claude Code Build Plan v1.0*
*53 modules · 8 phases · ~4 weeks*
