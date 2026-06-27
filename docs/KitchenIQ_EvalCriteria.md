# KitchenIQ — Evaluation Criteria
### Precise pass/fail checks for every build step
### A step is only complete when ALL criteria in that step pass.

---

## HOW TO USE

Each criterion is written as a binary check: it either passes or it doesn't.
- **PASS** = proceed to the next step
- **FAIL** = fix before proceeding — do not accumulate failures

Criteria are grouped into three tiers:
- `[FUNCTIONAL]` — the thing works correctly
- `[DESIGN]` — the thing looks and behaves exactly per spec
- `[INTEGRITY]` — the thing won't break something else later

---

---

# PHASE 1 — FOUNDATION

---

## STEP 1.1 — Project scaffold

**[FUNCTIONAL]**
- [ ] `npm run dev` starts without errors or warnings in the terminal
- [ ] `npm run build` completes without TypeScript errors
- [ ] All 9 npm packages are present in `package.json` dependencies (not devDependencies, except tailwind/postcss/autoprefixer)
- [ ] All 6 folders exist: `src/components/ui/`, `src/components/layout/`, `src/screens/`, `src/lib/`, `src/stores/`, `src/types/`, `src/hooks/`

**[INTEGRITY]**
- [ ] No existing Vite boilerplate files remain (`src/assets/react.svg`, `App.css`, the default `App.tsx` content)
- [ ] `.gitignore` exists and includes `node_modules`, `dist`, `.env.local`

---

## STEP 1.2 — Global CSS and Tailwind config

**[FUNCTIONAL]**
- [ ] `bg-bg-base` resolves to `#FFFAF5` in a test element
- [ ] `bg-brand-action` resolves to `#7C3AED`
- [ ] `bg-healthy-card` resolves to `#003D20`
- [ ] `bg-watch-card` resolves to `#3D2000`
- [ ] `bg-critical-card` resolves to `#3D0008`
- [ ] `text-healthy` resolves to `#00DC82`
- [ ] `text-watch` resolves to `#FBB924`
- [ ] `text-critical` resolves to `#FF505F`
- [ ] All 4 keyframe animations (`breathe`, `drift1`, `drift2`, `drift3`) are defined in `index.css`
- [ ] `shimmer` keyframe is defined and uses `background-position`
- [ ] `body` has `max-width: 430px` and `margin: 0 auto`
- [ ] `body` has `background-color: #FFFAF5`
- [ ] Inter font is the first font-family on body

**[INTEGRITY]**
- [ ] No colour values outside the spec palette appear in `tailwind.config.ts` (no `blue-500`, no `gray-100`, none of Tailwind's defaults bleed into the `colors` override)
- [ ] `content` array in Tailwind config includes `./src/**/*.{ts,tsx}` so purging works

---

## STEP 1.3 — TypeScript types

**[FUNCTIONAL]**
- [ ] `MarginStatus` = exactly `'healthy' | 'watch' | 'critical'` — no other values
- [ ] `Unit` = exactly `'kg' | 'gram' | 'litre' | 'ml' | 'piece' | 'dozen'`
- [ ] `MarginResult` contains all 6 fields: `rawCost`, `wastageCost`, `overheadCost`, `totalCost`, `marginPercent`, `profitPerDish`, `status`
- [ ] `MarginResult` is NOT a database entity — it has no `id`, no `restaurant_id`, no `created_at`
- [ ] `Recipe` has `wastage_percent`, `overhead_percent`, `serves` — these are editable per dish, not global constants
- [ ] `RecipeIngredient` has both `quantity` and `unit` — the unit at recipe level can differ from the ingredient's storage unit
- [ ] `ImportedDish` has `confidence: number` and `needs_review: boolean`
- [ ] `PriceSpike` contains `affectedRecipes` with both `oldMargin` and `newMargin`
- [ ] Zero TypeScript errors when running `npx tsc --noEmit`

**[INTEGRITY]**
- [ ] No computed fields (`margin_percent`, `total_cost`, `profit_per_dish`) appear in any database entity type (`Recipe`, `Ingredient`, etc.)
- [ ] All foreign key fields in DB entity types are `string` (uuid), not nested objects — no `ingredient: Ingredient` inside `RecipeIngredient`

---

## STEP 1.4 — Cost calculator library

**[FUNCTIONAL]**
- [ ] `toBaseUnit(200, 'gram')` returns `0.2`
- [ ] `toBaseUnit(500, 'ml')` returns `0.5`
- [ ] `toBaseUnit(1, 'piece')` returns `1`
- [ ] `toBaseUnit(1, 'dozen')` returns `12`
- [ ] `ingredientCost(200, 'gram', 60)` returns `12` (200g of ₹60/kg ingredient = ₹12)
- [ ] `ingredientCost(100, 'ml', 400)` returns `40` (100ml of ₹400/litre cream = ₹40)
- [ ] The Dal Makhani test case:
  - Ingredients: tomato 200g @₹60/kg, cream 100ml @₹400/litre, butter 50g @₹500/kg
  - sellingPrice: 280, serves: 1, wastage: 10%, overhead: 20%
  - `rawCost` = (12 + 40 + 25) = 77
  - `wastageCost` = 7.7
  - `overheadCost` = 15.4
  - `totalCost` = 100.1
  - `marginPercent` = ((280 - 100.1) / 280) × 100 = 64.25%
  - `status` = `'healthy'`
  - `profitPerDish` = 179.9
- [ ] A dish with `sellingPrice: 200`, `totalCost: 160` returns `marginPercent: 20`, `status: 'critical'`
- [ ] A dish with `sellingPrice: 200`, `totalCost: 110` returns `marginPercent: 45`, `status: 'watch'`
- [ ] A dish with `sellingPrice: 200`, `totalCost: 90` returns `marginPercent: 55`, `status: 'healthy'`
- [ ] `formatCurrency(1234.7)` returns `'₹1,235'` (rounded to nearest rupee, with ₹ symbol)
- [ ] `formatCurrency(0)` returns `'₹0'`
- [ ] `formatMargin(64.25)` returns `'64.3%'` (1 decimal place)
- [ ] `getSpikePercent(60, 87)` returns `45` (45% increase)
- [ ] `getSpikePercent(60, 51)` returns `-15` (15% decrease)
- [ ] `isSpikeAlert(14.9)` returns `false`
- [ ] `isSpikeAlert(15)` returns `true`
- [ ] `isSpikeAlert(-15)` returns `true`
- [ ] `isSpikeAlert(-14.9)` returns `false`

**[INTEGRITY]**
- [ ] The file has zero imports from Supabase, React, or any external library — it is a pure TypeScript module
- [ ] No `console.log` statements in the final file
- [ ] Division by zero is handled: if `sellingPrice` is 0, `marginPercent` returns 0, not NaN or Infinity
- [ ] Division by zero handled: if `serves` is 0, function returns a safe default (throw or return 0-cost result)

---

## STEP 1.5 — Supabase client

**[FUNCTIONAL]**
- [ ] `import { supabase } from '@/lib/supabase'` works without runtime error
- [ ] `.env.local` exists with both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` keys
- [ ] Each query helper in `queries.ts` returns the correct TypeScript type (not `any`)
- [ ] `getRestaurant` returns `Restaurant | null`
- [ ] `getRecipes` returns `Recipe[]`
- [ ] `upsertIngredientPrice` logs a row to `ingredient_price_history`

**[INTEGRITY]**
- [ ] `.env.local` is listed in `.gitignore` — confirm with `git check-ignore -v .env.local`
- [ ] `.env.local.example` exists in the repo with placeholder values
- [ ] No hardcoded Supabase URL or API key appears anywhere in `src/`
- [ ] All query helpers catch errors and return `null` / `[]` rather than throwing — the UI must never crash from a failed Supabase call

---

## STEP 1.6 — Supabase schema migration

**[FUNCTIONAL]**
- [ ] All 9 tables exist in Supabase after running the migration
- [ ] `ingredient_price_history.change_percent` is nullable (first price entry has no previous price)
- [ ] `recipe_ingredients` has `ON DELETE CASCADE` from `recipes` — deleting a recipe deletes its ingredient rows
- [ ] `recipe_ingredients` has `ON DELETE RESTRICT` from `ingredients` — cannot delete an ingredient used in a recipe
- [ ] `nutrition_data` has a UNIQUE constraint on `recipe_id`
- [ ] `ai_tips.expires_at` is non-nullable

**[DESIGN]**
- [ ] Seed data: all 40 ingredients exist in the reference library table
- [ ] All seed prices are in ₹/kg equivalent (cream stored as 400 with unit 'litre', eggs stored as 8 with unit 'piece')

**[INTEGRITY]**
- [ ] RLS is ENABLED on all 9 tables (check in Supabase dashboard under Authentication > Policies)
- [ ] A test with a different user's `auth.uid()` cannot read another restaurant's recipes
- [ ] `ingredient_nutrition` (IFCT reference table) has no RLS — it is globally readable
- [ ] All `restaurant_id` foreign keys cascade correctly — deleting a restaurant deletes all its data

---

## STEP 1.7 — Zustand stores

**[FUNCTIONAL]**
- [ ] `restaurantStore.fetchRestaurant(userId)` populates `restaurant` state
- [ ] `ingredientStore.updateIngredientPrice(id, newPrice)` updates the ingredient's `price_per_kg` in local state immediately (before Supabase confirms)
- [ ] `ingredientStore.updateIngredientPrice` writes a row to `ingredient_price_history` via Supabase
- [ ] `ingredientStore.updateIngredientPrice` sets `spikes` in state when change ≥ 15%
- [ ] `recipeStore.getMarginForRecipe(recipeId)` returns a `MarginResult` using the current ingredient prices from `ingredientStore`
- [ ] Changing an ingredient price in `ingredientStore` causes `getMarginForRecipe` to return an updated margin on the next call (no stale cache)

**[INTEGRITY]**
- [ ] `getMarginForRecipe` calls `calculateMargin` from `costCalculator.ts` — it does NOT reimplement the formula
- [ ] All three stores persist to localStorage — reload the page and state survives
- [ ] localStorage keys are prefixed (`kitcheniq-restaurant`, `kitcheniq-ingredients`, `kitcheniq-recipes`)
- [ ] No circular imports between stores

---

## STEP 1.8 — Router and app shell

**[FUNCTIONAL]**
- [ ] All 18 routes render without a white screen or console error
- [ ] Navigating from `/dashboard` to `/recipes` plays the spring page transition
- [ ] Back navigation (browser back or back button) plays the reverse transition
- [ ] Unauthenticated users visiting `/dashboard` are redirected to `/login`
- [ ] Authenticated users visiting `/login` are redirected to `/dashboard`
- [ ] `QueryClientProvider` wraps the app — confirm with React DevTools

**[DESIGN]**
- [ ] Page transition: incoming page slides from x: '100%' to x: 0
- [ ] Page transition: outgoing page scales to 0.94 and fades to opacity 0 simultaneously
- [ ] Spring parameters: stiffness 380, damping 30, mass 0.8 — measurably springy, not linear
- [ ] Background during transition is `#FFFAF5`, not white or black

**[INTEGRITY]**
- [ ] `AnimatePresence` has `mode="popstate"` or equivalent to prevent double-render flash
- [ ] Each `motion.div` wrapper has `position: fixed; inset: 0; overflow: auto` — no content is clipped during transition
- [ ] TanStack Query `staleTime` is set to at least 5 minutes — avoid unnecessary refetches

---

---

# PHASE 2 — AUTH SCREENS

---

## STEP 2.1 — DarkHeader component

**[FUNCTIONAL]**
- [ ] `showBack={true}` renders an ArrowLeft button that calls `navigate(-1)`
- [ ] `breadcrumb="Menu"` renders the breadcrumb text next to the back arrow
- [ ] `rightElement` renders in the top-right corner without overlapping the title
- [ ] `children` renders below the subtitle
- [ ] `subtitle` is absent when prop not passed — no empty gap

**[DESIGN]**
- [ ] Header background is exactly `#0D0A14` — not `#000`, not `#111`
- [ ] Primary glow: positioned top -50px, right -40px, 220×220px, correct saffron radial gradient, `breathe` animation running
- [ ] Secondary halo: positioned top -20px, right -10px, 120×120px, visible as a softer inner glow
- [ ] Purple counter-glow: positioned bottom -20px, left -10px, 100×100px, visible
- [ ] All 4 spice dots present: correct sizes (2.5px, 2px, 2px, 2px), correct colours (#F5A623, #E8630A), correct drift animations
- [ ] Spice dots animate continuously — they are not static
- [ ] All glow layers have `pointer-events: none` — tapping the header area reaches the back button
- [ ] Title text: white, 15px, font-semibold, tracking-tight
- [ ] Subtitle text: `rgba(255,255,255,0.36)`, 9px
- [ ] Back button text (breadcrumb): `rgba(255,255,255,0.40)`, 9px
- [ ] ArrowLeft icon: size 14, strokeWidth 1.5

**[INTEGRITY]**
- [ ] `overflow: hidden` on the outer container — glows do not bleed into the page body
- [ ] Component works with `showBack={false}` and no `rightElement` — no layout shift or error

---

## STEP 2.2 — Core UI components

**Button**
- [ ] Primary: bg `#7C3AED`, text white, font-bold, box-shadow `0 4px 16px rgba(124,58,237,0.3)`
- [ ] Ghost: border `#EDE8F5`, text `#1A1A1A`, no background
- [ ] Both variants: `whileTap` scale 0.96, opacity 0.85, spring stiffness 500 damping 30
- [ ] Disabled state: opacity 0.5, not tappable
- [ ] `fullWidth` makes the button 100% width

**Card**
- [ ] bg white, rounded-[14px], border exactly 0.5px `#EDE8F5`
- [ ] With `onClick`: `whileTap` scale 0.97 opacity 0.85, cursor-pointer
- [ ] Without `onClick`: no tap animation, normal cursor

**StatCard**
- [ ] Healthy: bg `#003D20`, number colour `#00DC82`, border `rgba(0,220,130,0.4)` at 0.5px
- [ ] Watch: bg `#3D2000`, number colour `#FBB924`, border `rgba(251,185,36,0.4)` at 0.5px
- [ ] Critical: bg `#3D0008`, number colour `#FF505F`, border `rgba(255,80,95,0.4)` at 0.5px
- [ ] Label: 6px, uppercase, letter-spacing 0.05em, same colour as number at 55% opacity
- [ ] Number: 20px, font-weight 700, letter-spacing -0.5px

**MarginBar**
- [ ] Height exactly 3px
- [ ] Track colour `#F5F0FA`
- [ ] Fill colour: `#00DC82` if ≥50%, `#FBB924` if ≥30%, `#FF505F` if <30%
- [ ] Fill width transition uses cubic-bezier(0.34, 1.56, 0.64, 1) — it slightly overshoots then settles
- [ ] `percent={0}` renders an empty track, no fill
- [ ] `percent={100}` fills completely with no overflow

**Skeleton**
- [ ] Shimmer animation runs continuously
- [ ] Gradient: `#F0EBF8 → #E8E0F5 → #F0EBF8` — warm purple tint, not grey
- [ ] `width`, `height`, `radius` props all apply correctly

**StatusBadge**
- [ ] Healthy: bg `#F0FBF5`, text `#00A36C`
- [ ] Watch: bg `#FFF8EC`, text `#F59E0B`
- [ ] Critical: bg `#FFF5F6`, text `#FF505F`
- [ ] 9px font, rounded-full, px-2 py-0.5

**AiTipCard**
- [ ] If `isLoading`: shows Skeleton, not a spinner
- [ ] If no tip (null/undefined): renders nothing — no empty card, no error message
- [ ] Tip text: `#5B21B6`, 11px
- [ ] Card bg: `#F5F0FA`
- [ ] Sparkles icon: `#7C3AED`

**BottomNav**
- [ ] Active tab colour: `#7C3AED` (icon + label)
- [ ] Inactive tab colour: `#BBBBBB`
- [ ] bg white, border-top 0.5px `#EDE8F5`
- [ ] Correct icons: Home, UtensilsCrossed (or ChefHat), Package, Lightbulb, Settings — all strokeWidth 1.5, size 18
- [ ] Active tab determined by `useLocation()` — correct tab highlights on each route
- [ ] Tap animation: spring scale 0.92

---

## STEP 2.3 — Splash / login screen

**[FUNCTIONAL]**
- [ ] Empty email submit shows "Enter a valid email" error inline — no alert(), no console.log
- [ ] Invalid email format ("notanemail") shows the same error
- [ ] Valid email triggers `supabase.auth.signInWithOtp({ email })` — confirm in Supabase Auth logs
- [ ] Button shows loading state (disabled + spinner or "Sending...") during the OTP request
- [ ] On success: navigates to `/otp` with the email stored (in state or store) for the OTP screen to use
- [ ] On Supabase error: shows "Something went wrong — try again" inline

**[DESIGN]**
- [ ] Full screen bg `#0D0A14` — no light background
- [ ] Logo size 48, centered
- [ ] "KitchenIQ" text: white, 28px, font-bold, letter-spacing -0.5px
- [ ] Tagline: `rgba(255,255,255,0.50)`, 12px
- [ ] Input: bg `rgba(255,255,255,0.08)`, border `rgba(255,255,255,0.12)`, text white, rounded-[10px], px-4 py-3, 13px
- [ ] Input focus: border changes to `rgba(124,58,237,0.6)` — visible purple tint
- [ ] "Beta — Free" badge: bg `rgba(124,58,237,0.2)`, text `#A78BFA`, 9px, rounded-full, positioned bottom corner

---

## STEP 2.4 — OTP verification screen

**[FUNCTIONAL]**
- [ ] 6 separate input boxes render, each accepting exactly 1 digit
- [ ] Typing in box 1 auto-advances focus to box 2 (and so on to box 6)
- [ ] Backspace on an empty box moves focus to the previous box
- [ ] Pasting "123456" fills all 6 boxes correctly
- [ ] Verify button calls `supabase.auth.verifyOtp()` with the assembled 6-digit token
- [ ] On success: checks for existing restaurant → routes to `/dashboard` or `/setup` accordingly
- [ ] On wrong code: shake animation on the input row, "Incorrect code" text below
- [ ] Resend button: disabled for 60 seconds, shows "Resend in Xs" countdown, enables after
- [ ] If no email in state: redirects to `/login` immediately on mount

**[DESIGN]**
- [ ] Each input box: 44×52px, bg white, border 0.5px `#EDE8F5`, rounded-[10px], text-center, 24px font-bold
- [ ] Focused box: border `#7C3AED`
- [ ] 6 boxes spaced evenly in a row with equal gaps

---

---

# PHASE 3 — ONBOARDING

---

## STEP 3.1 — Restaurant setup screen

**[FUNCTIONAL]**
- [ ] Submitting with empty name shows "Enter your restaurant name" error
- [ ] Submitting with name < 2 chars shows error
- [ ] City and cuisine dropdowns are required — submitting without them shows errors
- [ ] Successful submit creates a record in the `restaurants` Supabase table
- [ ] Restaurant data is stored in `restaurantStore` after save
- [ ] Navigation goes to `/onboarding/import` after save
- [ ] If user already has a restaurant (returning user): redirect to `/dashboard` on mount — no setup screen shown

**[DESIGN]**
- [ ] Exactly 3 visible fields (name, city, cuisine) — FSSAI is hidden behind a link
- [ ] FSSAI input appears below the link when tapped, with a "Skip" affordance
- [ ] Skeleton shows during the save request — not a spinner

---

## STEP 3.2 — Menu photo import screen

**[FUNCTIONAL]**
- [ ] Tapping the upload zone triggers the file picker
- [ ] File picker accepts `image/*` and `application/pdf` only
- [ ] After file selection: preview image shown (for images), loading state shown
- [ ] Loading state cycles through messages: "Finding dishes..." → "Reading prices..." → "Almost done..."
- [ ] Edge Function called with base64 image — network tab confirms request
- [ ] Review state: dish count displayed ("We found 34 dishes")
- [ ] Dishes with `confidence < 0.7` show amber border and "Please review" badge
- [ ] Tapping X on a dish removes it from the list
- [ ] Dish name and price are inline-editable in the review state
- [ ] "Add dish" adds a blank editable row
- [ ] Confirm saves all dishes as `Recipe` records — verify in Supabase `recipes` table
- [ ] "Skip for now" navigates to `/onboarding/parse` without saving anything

**[INTEGRITY]**
- [ ] If more than 100 dishes returned: list is trimmed to 100 with a visible warning
- [ ] If Edge Function returns error: shows "We couldn't read the menu — try another photo" with a retry button, not a crash

---

## STEP 3.3 — Edge Function: menu-import

**[FUNCTIONAL]**
- [ ] Receives `imageBase64`, `mediaType`, `restaurantId`, `cuisineType`, `city`
- [ ] Returns valid JSON array of `ImportedDish[]`
- [ ] Dishes with unreadable prices have `selling_price: 0` and `needs_review: true`
- [ ] Dishes with `confidence < 0.7` have `needs_review: true`
- [ ] Function returns HTTP 200 even when Claude returns partial data
- [ ] Function returns HTTP 503 with `{ error: 'import_failed', fallback: true }` when Claude API fails
- [ ] API key read from `Deno.env.get('ANTHROPIC_API_KEY')` — never hardcoded

**[INTEGRITY]**
- [ ] Test with a real printed Indian restaurant menu photo: ≥85% of dish names correctly extracted
- [ ] Test with a blurry or low-quality photo: returns partial results, not a crash
- [ ] No `console.log` in production code — use `console.error` for errors only
- [ ] Response time for a 10-dish menu: under 8 seconds

---

## STEP 3.4 — AI text parser screen

**[FUNCTIONAL]**
- [ ] Submitting empty textarea shows "Please describe your dish" error
- [ ] Example chips fill the textarea when tapped
- [ ] Edge Function called with textarea content — network tab confirms
- [ ] Result card shows dish name, extracted ingredients, estimated cost per ingredient, estimated margin
- [ ] "Save dish" button saves Recipe + RecipeIngredients to Supabase
- [ ] "Add another dish" resets the form for a new entry
- [ ] "Go to dashboard" navigates to `/dashboard`
- [ ] "Skip" ghost button navigates to `/dashboard` without saving

**[DESIGN]**
- [ ] Skeleton (not spinner) shown while Edge Function runs
- [ ] Result is editable before saving — owner can correct extracted data

---

## STEP 3.5 — Edge Function: ai-recipe-parser

**[FUNCTIONAL]**
- [ ] "Dal Makhani with urad dal, butter, cream, tomatoes" returns structured JSON with those ingredients
- [ ] Returned units are from the allowed set: `kg | gram | litre | ml | piece | dozen`
- [ ] `wastage_percent` defaults to 10 if not inferable
- [ ] `overhead_percent` defaults to 20 if not inferable
- [ ] `serves` defaults to 1 if not inferable
- [ ] If ingredient name matches library: price uses library price, not Claude's estimate
- [ ] Returns HTTP 200 even if Claude's response is partial

---

## STEP 3.6 — Ingredient picker screen

**[FUNCTIONAL]**
- [ ] All 40 library ingredients rendered on load
- [ ] Search filters list in real time (case-insensitive)
- [ ] Ticking an ingredient marks it as selected — visual state changes immediately
- [ ] Price inputs accept numeric keyboard input
- [ ] Prices default to library values — they are not empty
- [ ] Save: all ticked ingredients written to `ingredients` table for this restaurant
- [ ] "Skip" navigates to `/dashboard` without saving

**[DESIGN]**
- [ ] Grouped by category with category headers: Vegetables, Dairy, Proteins, Oils, Grains, Spices, Nuts
- [ ] ₹ prefix on all price inputs
- [ ] Unit label (per kg, per piece, etc.) shown next to each price

---

---

# PHASE 4 — CORE SCREENS

---

## STEP 4.1 — Dashboard screen

**[FUNCTIONAL]**
- [ ] AI summary card shows cached insight text — not a placeholder
- [ ] Stat block counts are accurate: sum of healthy/watch/critical recipe counts equals total recipes
- [ ] Tapping a stat block navigates to `/recipes` with the correct status filter pre-applied
- [ ] Alert strip only appears when at least one ingredient has `change_percent ≥ 15` since last update
- [ ] Dish list is sorted by `marginPercent` ascending (worst first) by default
- [ ] Tapping a dish card navigates to `/recipes/:id`
- [ ] Pull to refresh re-fetches recipes and ingredients and recomputes margins

**[DESIGN]**
- [ ] Stat block numbers count up from 0 to final value on first load — animation takes ~800ms
- [ ] Exactly 4 Skeleton cards shown while dish list loads — not a spinner
- [ ] AI summary Skeleton shows 2 placeholder lines — not "Loading..."
- [ ] BottomNav visible and Home tab is active
- [ ] Bottom padding accounts for BottomNav — last dish card not obscured

**[INTEGRITY]**
- [ ] Margins are computed live from `getMarginForRecipe` — not read from any stored column
- [ ] Dashboard loads in under 2 seconds on a 4G network simulation (Chrome DevTools throttle)

---

## STEP 4.2 — Edge Function: ai-dashboard-summary

**[FUNCTIONAL]**
- [ ] Returns a 1–2 sentence string referencing specific dish names
- [ ] Second call within 6 hours returns the cached value from `ai_insights` without calling Claude
- [ ] Response contains `{ summary: string, cached: boolean }`
- [ ] If 0 dishes exist: returns "Add your first dishes to get AI insights" (no Claude call)

**[INTEGRITY]**
- [ ] Summary mentions at least one actual dish name from the data — not generic text
- [ ] If all dishes are healthy: summary reflects that (not a false alarm)

---

## STEP 4.3 — Recipe list screen

**[FUNCTIONAL]**
- [ ] Filter chips correctly filter the list: "Healthy" shows only margin ≥50% dishes, etc.
- [ ] Category chips filter by the recipe's `category` field
- [ ] Search input filters dish names in real time — matches partial strings, case-insensitive
- [ ] Filter and search work simultaneously (can filter to "Critical" AND search for "paneer")
- [ ] Empty state shows when no dishes match — not an empty scrollable area
- [ ] `+` button in header navigates to `/recipes/new`

**[DESIGN]**
- [ ] Active filter chip: bg `#7C3AED`, text white
- [ ] Inactive filter chip: bg white, border `#EDE8F5`, text `#1A1A1A`
- [ ] Chips horizontally scrollable without affecting page scroll

---

## STEP 4.4 — Recipe detail screen

**[FUNCTIONAL]**
- [ ] Margin number shown is identical to what the dashboard shows for the same dish
- [ ] Count-up animation plays on mount — number goes from 0 to final value
- [ ] AiTipCard: if tip exists and not expired, shows it; if loading, shows Skeleton; if error, shows nothing
- [ ] Ingredient list shows correct cost per ingredient (calculated, not stored)
- [ ] "Generate nutrition label" button navigates to `/recipes/:id/nutrition`
- [ ] "Edit recipe" button navigates to `/recipes/:id/edit`

**[DESIGN]**
- [ ] Margin number: 36px, font-bold, colour matches status (green/amber/red)
- [ ] Status badge shown below margin number
- [ ] Profit text: "₹182 profit per plate" in status colour, 13px
- [ ] Cost text: "Costs ₹98 to make" in `#888888`, 11px
- [ ] MarginBar on this screen is 6px height (larger than list view's 3px)
- [ ] Ingredients sorted by cost contribution, highest first

**[INTEGRITY]**
- [ ] AI tip never shows an error state — null tip = nothing rendered
- [ ] AI tip card not visible at all for 'healthy' dishes (tip only fires for critical/watch)

---

## STEP 4.5 — Edge Function: ai-tip

**[FUNCTIONAL]**
- [ ] Tip text references the specific dish name and at least one ingredient
- [ ] Tip text includes a specific ₹ amount or gram quantity
- [ ] Response time under 3 seconds — if over, returns `{ tip: null }`
- [ ] Second call within 24 hours returns cached tip from `ai_tips` table without calling Claude
- [ ] Tip only generated for `status === 'critical'` or `status === 'watch'` — healthy dishes return `{ tip: null }`

**[INTEGRITY]**
- [ ] If Claude API times out or fails: returns `{ tip: null }` with HTTP 200, not 500
- [ ] `expires_at` is exactly `now() + 24 hours` in the stored record

---

---

# PHASE 5 — INPUT SCREENS

---

## STEP 5.1 — Add recipe screen

**[FUNCTIONAL]**
- [ ] All 6 fields validate on submit — empty required fields show specific error messages
- [ ] Selling price rejects non-numeric input
- [ ] Wastage % rejects values outside 0–50
- [ ] Overhead % rejects values outside 0–100
- [ ] Serves rejects 0 and negative values
- [ ] Live margin preview updates within 300ms of any field change
- [ ] Live margin preview shows "Add ingredients to see margin" when no ingredients added yet
- [ ] Adding an ingredient via bottom sheet adds it to the ingredient list with its cost
- [ ] Save creates a `recipes` row AND the correct number of `recipe_ingredients` rows
- [ ] After save, navigates to `/recipes/:newId` and the new dish appears in the recipe detail

**[DESIGN]**
- [ ] All inputs: bg `#FFFAF5`, border 0.5px `#EDE8F5`, focus border `#7C3AED`
- [ ] Live margin card uses the same StatCard-like tinted colour as the dashboard
- [ ] ₹ prefix rendered inside the selling price input (not as a placeholder)

---

## STEP 5.2 — Ingredient bottom sheet

**[FUNCTIONAL]**
- [ ] Slides up from bottom with spring animation (y: '100%' → y: 0)
- [ ] Dark overlay behind sheet — tapping overlay closes the sheet
- [ ] Search input filters ingredient list in real time
- [ ] Selecting an ingredient shows quantity + unit input
- [ ] Unit selector uses pill chips, not a `<select>` element
- [ ] Cost for the entered quantity is shown live (recalculates as quantity changes)
- [ ] "Add to recipe" adds the ingredient to the form and closes the sheet
- [ ] "Create new ingredient" link works

**[DESIGN]**
- [ ] Drag handle: 32×4px, bg `#EDE8F5`, rounded, centered at top of sheet
- [ ] Sheet background: white, rounded top corners (radius 20px)
- [ ] Overlay: `rgba(0,0,0,0.4)` — not fully black, not transparent

**[INTEGRITY]**
- [ ] Sheet cannot be opened twice simultaneously
- [ ] Closing the sheet without adding does not modify the recipe form

---

## STEP 5.3 — Edit recipe screen

**[FUNCTIONAL]**
- [ ] Form pre-populates with the recipe's existing data on mount
- [ ] Existing ingredients are shown in the ingredient list
- [ ] Saving overwrites the old `recipe_ingredients` correctly — no duplicate rows
- [ ] "Delete dish" shows inline confirmation before deleting
- [ ] Deletion removes the row from `recipes` and all `recipe_ingredients` via cascade
- [ ] After deletion: navigates to `/recipes` and the dish is gone from the list
- [ ] "Duplicate dish" creates a new recipe with "Copy of " prefix — confirm in Supabase

---

## STEP 5.4 — Ingredient manager screen

**[FUNCTIONAL]**
- [ ] All restaurant ingredients displayed, sorted by `last_updated` ascending (stalest first)
- [ ] Ingredients not updated in 7+ days show an amber stale indicator
- [ ] Alert banner appears when any ingredient is 7+ days stale
- [ ] Search filters in real time
- [ ] Tapping an ingredient navigates to `/ingredients/:id`

**[DESIGN]**
- [ ] "Last updated 3 days ago" shown in relative time format, not absolute timestamps
- [ ] Stale indicator: amber dot or badge, consistent with the design system colours

---

## STEP 5.5 — Ingredient detail and price history

**[FUNCTIONAL]**
- [ ] Current price displayed in the format "₹60/kg" or "₹8/piece" (unit-aware)
- [ ] Tapping the price makes it editable — input appears in place
- [ ] Save triggers `upsertIngredientPrice` in the store
- [ ] Price history logs the new entry — confirm in `ingredient_price_history` table
- [ ] If change ≥ 15%: spike is stored in `ingredientStore.spikes` — dashboard alert strip appears
- [ ] "Updated" confirmation shown after save — brief and dismissive (not a modal)
- [ ] Price history chart renders with correct dates and values
- [ ] "Not enough history yet" placeholder shown when fewer than 2 data points
- [ ] Affected dishes list shows correct recipes and their current margins

**[INTEGRITY]**
- [ ] Margin for affected dishes updates immediately after price save — no stale value shown
- [ ] The margin recalculation uses `getMarginForRecipe` from the store, not a direct calculation

---

---

# PHASE 6 — AI FEATURES

---

## STEP 6.1 — Price spike detection

**[FUNCTIONAL]**
- [ ] Changing tomato from ₹60 to ₹87 (45% increase) triggers a spike
- [ ] Changing tomato from ₹60 to ₹70 (16.7% increase) triggers a spike
- [ ] Changing tomato from ₹60 to ₹69 (15% exact) triggers a spike
- [ ] Changing tomato from ₹60 to ₹68 (13.3% increase) does NOT trigger a spike
- [ ] Price decrease of ≥15% also triggers a spike
- [ ] Spike entry contains: `ingredient`, `previousPrice`, `newPrice`, `changePercent`, `affectedRecipes` with both old and new margins
- [ ] Dashboard alert strip appears within one navigation cycle of the price change (no page refresh needed)
- [ ] Dismissed alerts (stored in localStorage) do not reappear after page reload
- [ ] Multiple simultaneous spikes are shown in a single alert strip, not multiple banners

**[INTEGRITY]**
- [ ] `affectedRecipes` is computed using the actual `recipe_ingredients` data — not a guess
- [ ] Old margin is calculated with old price, new margin with new price — both using `calculateMargin`

---

## STEP 6.2 — Edge Function: ai-spike-recommendations

**[FUNCTIONAL]**
- [ ] Returns one specific action per affected recipe
- [ ] Each action names the dish and includes a specific ₹ amount or quantity change
- [ ] Recommendations are saved to `ai_insights` with `insight_type = 'spike_alert'`
- [ ] Function completes within 5 seconds for up to 5 affected recipes

**[INTEGRITY]**
- [ ] If Claude fails: returns `{ recommendations: [] }` with HTTP 200, not 500
- [ ] The recommendations reference the correct ingredient that spiked (not a different one)

---

## STEP 6.3 — Alert detail screen

**[FUNCTIONAL]**
- [ ] Ingredient name and price change displayed correctly: "Tomato: ₹40 → ₹58/kg (+45%)"
- [ ] Each affected recipe shows: old margin %, new margin %, status change badge
- [ ] AI recommendation shown per dish in `#5B21B6` italic text
- [ ] Dismiss button marks the `ai_insights` record as dismissed
- [ ] After dismiss: alert strip gone from dashboard, navigates back

**[DESIGN]**
- [ ] Old margin → new margin shown with a visual arrow between them
- [ ] Status change (Watch → Critical) shown as a badge with before/after

---

## STEP 6.4 — AI insights screen

**[FUNCTIONAL]**
- [ ] "Reprice" section only shows dishes where `marginPercent < 30` for more than 7 days
- [ ] "Promote" section shows the top 2 highest-margin dishes
- [ ] "Consider removing" section only shows dishes where `marginPercent < 30` for more than 30 days
- [ ] "Apply" on a reprice suggestion updates `selling_price` in Supabase and recalculates margin
- [ ] After applying: the dish moves out of the "Reprice" section (margin is now above 30%)
- [ ] "Refresh insights" triggers the `ai-menu-optimisation` Edge Function
- [ ] Empty state shows when all dishes are healthy — no false alarms

**[INTEGRITY]**
- [ ] Dismissed insights do not reappear after page reload
- [ ] Insights from a different restaurant are never shown (RLS enforced at query level)

---

## STEP 6.5 — Edge Function: ai-menu-optimisation

**[FUNCTIONAL]**
- [ ] Returns at most 1 reprice suggestion per dish (no duplicates)
- [ ] `suggested_price` for reprice insights is a specific ₹ number, not a range
- [ ] Promote insights reference only dishes with `marginPercent ≥ 50`
- [ ] Remove insights only appear for dishes `marginPercent < 30`
- [ ] Results upserted to `ai_insights` — old non-dismissed insights replaced

**[INTEGRITY]**
- [ ] Function reads from DB, not from the request payload — it cannot be spoofed with fake margin data
- [ ] If restaurant has 0 recipes: returns `{ insights: [] }` without calling Claude

---

---

# PHASE 7 — NUTRITION LABEL

---

## STEP 7.1 — Nutrition screen

**[FUNCTIONAL]**
- [ ] "Calculate nutrition" button calls the Edge Function — network tab confirms
- [ ] Skeleton shown while calculation runs
- [ ] After calculation: all 8 nutrient rows display with correct values and units
- [ ] `is_ai_estimate: true` shows the AI disclaimer text
- [ ] Dietary tags auto-detect correctly:
  - A recipe with paneer shows Vegetarian (not Vegan)
  - A recipe with onion and garlic does NOT show Jain
  - A recipe with no dairy or meat shows Vegan
  - A recipe with maida does NOT show Gluten-free
  - A recipe with chicken breast (high protein) shows "High protein" if protein >25g
- [ ] "Download PDF" triggers a file download named `[DishName]_NutritionLabel_KitchenIQ.pdf`
- [ ] WhatsApp share button opens `wa.me` deep link

**[DESIGN]**
- [ ] FSSAI label format: white card, table with rows, header "Nutrition information (per serving)"
- [ ] Footer: "% Daily values are based on 2000 kcal diet"
- [ ] Nutrients shown in this order: Energy, Protein, Carbohydrate (of which sugars), Fat (of which saturated fat), Fibre, Sodium

---

## STEP 7.2 — Edge Function: ai-nutrition

**[FUNCTIONAL]**
- [ ] Butter 50g: fat contribution is approximately 41g (50g × 82% fat content)
- [ ] Basmati rice 100g: carbohydrate contribution is approximately 78g
- [ ] Function correctly scales by `serves` — a recipe for 2 portions halves the per-portion values
- [ ] For unknown ingredients: Claude is called and `is_ai_estimate` set to true
- [ ] For known ingredients (in IFCT table): Claude is NOT called
- [ ] Result saved to `nutrition_data` table with `recipe_id` (upsert)

**[INTEGRITY]**
- [ ] If fewer than 3 ingredients: returns an error response, does not generate a label
- [ ] Nutrient values are always positive numbers — never negative

---

---

# PHASE 8 — SETTINGS AND POLISH

---

## STEP 8.1 — Settings screen

**[FUNCTIONAL]**
- [ ] Restaurant name, city, cuisine type are editable and save to Supabase on confirm
- [ ] FSSAI number is editable
- [ ] "Export recipes as CSV" downloads a file with: name, category, selling price, margin %, status
- [ ] "Export ingredients as CSV" downloads a file with: name, current price, unit, last updated
- [ ] CSV files open correctly in Excel/Google Sheets (correct delimiter, no encoding errors)
- [ ] Sign out calls `supabase.auth.signOut()`, clears all three Zustand stores, navigates to `/login`
- [ ] After sign out: visiting `/dashboard` redirects to `/login`

**[DESIGN]**
- [ ] "Beta — Free" badge: bg `rgba(124,58,237,0.15)`, text `#7C3AED`, rounded-full
- [ ] ₹499/month plan section is visibly greyed out — not interactive

---

## STEP 8.2 — Loading states and polish audit

**[FUNCTIONAL]**
- [ ] Zero screens show a plain spinner (circular loader) at any point
- [ ] Zero screens show "Loading..." text at any point
- [ ] Every list screen has a non-empty Skeleton state that matches the expected list item shape
- [ ] Every list screen has an empty state with a clear action when 0 items exist
- [ ] Network error on any screen shows "Something went wrong — tap to retry" (never a crash)
- [ ] Retry button re-fetches the data

**[DESIGN]**
- [ ] Every `<Card onClick={...}>` has `whileTap` spring animation — no exceptions
- [ ] Every `<Button>` has `whileTap` spring animation — no exceptions
- [ ] Page transition plays on every route change — including back navigation

**[INTEGRITY]**
- [ ] Grep result for `strokeWidth` in all Lucide icon usages: every instance is `strokeWidth={1.5}` — no 1, no 2, no missing
- [ ] Grep result for hardcoded hex values in JSX: only the allowed colours from the design token list appear. Forbidden: Tailwind defaults like `#3b82f6`, standard greys, any hex not in the spec
- [ ] Grep result for `color: #` and `background: #` in inline styles: each value is from the spec palette
- [ ] Grep result for `margin_percent`, `total_cost`, `profit_per_dish` as database columns: zero results — these are never stored

---

## STEP 8.3 — Integration test flows

### Flow 1 — New owner, photo import
- [ ] Entering an email on Splash sends an OTP (confirm in Supabase Auth logs)
- [ ] OTP code verifies and redirects to `/setup` (not `/dashboard`)
- [ ] Completing setup creates a restaurant record — confirm in Supabase table
- [ ] Uploading a menu photo calls the Edge Function — confirm in Supabase Function logs
- [ ] At least 5 dishes are returned from the import
- [ ] Confirming dishes saves them to the `recipes` table — confirm row count
- [ ] Selecting ingredients on the picker screen saves to the `ingredients` table
- [ ] Dashboard renders with correct stat counts after onboarding completes

### Flow 2 — Returning owner, daily use
- [ ] Opening the app with an active session skips login — goes directly to `/dashboard`
- [ ] Tapping a critical dish opens `/recipes/:id` with the correct dish
- [ ] Editing the selling price on `/recipes/:id/edit` and saving: margin updates in the detail screen
- [ ] Updated margin also reflected on the dashboard (no stale value)

### Flow 3 — Price update and spike
- [ ] Updating tomato price from ₹60 to ₹90 on `/ingredients/:id` saves the new price
- [ ] `ingredient_price_history` has a new row for this change
- [ ] The alert strip appears on `/dashboard` without requiring a page refresh
- [ ] Tapping the alert strip navigates to `/alerts/:id`
- [ ] The alert detail shows correct before/after margins for each affected dish
- [ ] Dismissing the alert removes the strip from the dashboard
- [ ] The strip does not reappear after navigating away and back

### Flow 4 — Nutrition label
- [ ] Tapping "Generate nutrition label" on a recipe detail calls the Edge Function
- [ ] All 8 nutrient values appear in the FSSAI label format
- [ ] Dietary tags are correct for the recipe's actual ingredients
- [ ] Downloading the PDF produces a file with the correct filename format
- [ ] The PDF opens and shows the nutrition data correctly

---

---

# GLOBAL CRITERIA
### These apply to every step, every screen, every function

**[FUNCTIONAL]**
- [ ] Zero `console.error` outputs during normal operation (errors in expected paths handled silently)
- [ ] Zero unhandled promise rejections — every `async` call has a `catch`
- [ ] Zero TypeScript errors (`npx tsc --noEmit` returns 0)
- [ ] Zero ESLint errors if ESLint is configured

**[DESIGN]**
- [ ] Every screen has a DarkHeader — zero exceptions
- [ ] Every button is `#7C3AED` with white text — zero exceptions (destructive actions use red ghost variant only)
- [ ] Every Lucide icon has `strokeWidth={1.5}` — zero exceptions
- [ ] App background is always `#FFFAF5` — zero exceptions
- [ ] Card background is always `#FFFFFF` with border `#EDE8F5` — zero exceptions

**[INTEGRITY]**
- [ ] Margin, total cost, and profit are never read from a database column — always computed live
- [ ] All Claude API calls go through Supabase Edge Functions — zero direct calls from the browser
- [ ] Each user can only read their own restaurant's data (verified by attempting cross-restaurant access)

---

*End of KitchenIQ Evaluation Criteria*
*26 build steps · 3 criteria tiers · 300+ individual checks*
