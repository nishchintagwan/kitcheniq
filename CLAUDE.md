# CLAUDE.md — KitchenIQ Working Environment
### Read this file at the start of every session. It is the single source of truth for how this project is built.

---

## 1. HOW THIS REPO WORKS

KitchenIQ is an AI-native mobile web app for independent Indian restaurant owners. It does three things: margin intelligence, menu optimisation, and operations autopilot. Everything else is out of scope.

**The repo structure when complete:**

```
kitcheniq/
├── CLAUDE.md                        ← this file — read every session
├── docs/
│   ├── KitchenIQ_Spec_v3.md         ← product spec — source of truth for WHAT to build
│   ├── KitchenIQ_BuildPlan.md       ← 26-step build plan — source of truth for HOW to build it
│   ├── KitchenIQ_EvalCriteria.md    ← 300+ pass/fail checks — source of truth for DONE
│   └── KitchenIQ_DesignPrompt.md    ← design system — source of truth for HOW it looks
├── src/
│   ├── components/
│   │   ├── ui/                      ← DarkHeader, Button, Card, StatCard, MarginBar, Skeleton,
│   │   │                               StatusBadge, AiTipCard, BottomNav, Logo, IngredientBottomSheet
│   │   └── layout/                  ← layout wrappers
│   ├── screens/                     ← one file per route (18 screens total)
│   ├── lib/
│   │   ├── costCalculator.ts        ← THE most important file — all margins flow from here
│   │   ├── supabase.ts              ← Supabase client
│   │   └── queries.ts               ← typed Supabase query helpers
│   ├── stores/
│   │   ├── restaurantStore.ts       ← Zustand: restaurant state
│   │   ├── ingredientStore.ts       ← Zustand: ingredients + spike detection
│   │   └── recipeStore.ts           ← Zustand: recipes + getMarginForRecipe selector
│   ├── types/
│   │   └── index.ts                 ← all TypeScript interfaces — match DB schema exactly
│   ├── hooks/                       ← custom React hooks
│   ├── App.tsx                      ← router + AnimatePresence + QueryClientProvider
│   └── index.css                    ← keyframes only — no component styles
├── supabase/
│   ├── functions/                   ← Edge Functions (all Claude API calls live here)
│   │   ├── menu-import/
│   │   ├── ai-recipe-parser/
│   │   ├── ai-dashboard-summary/
│   │   ├── ai-tip/
│   │   ├── ai-spike-recommendations/
│   │   ├── ai-menu-optimisation/
│   │   └── ai-nutrition/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seeds/
│       └── 001_ingredients.sql
├── tailwind.config.ts               ← locked — never change colours here
├── .env.local                       ← gitignored — contains Supabase + Anthropic keys
└── .env.local.example               ← committed — shows required env var keys
```

**The three documents you will be asked to reference often:**

| Document | Path | When to read it |
|---|---|---|
| Product spec | `docs/KitchenIQ_Spec_v3.md` | Anytime there's ambiguity about what something should do |
| Build plan | `docs/KitchenIQ_BuildPlan.md` | Before starting any step — read the step prompt in full |
| Eval criteria | `docs/KitchenIQ_EvalCriteria.md` | After completing any step — run through all checks before declaring done |
| Design prompt | `docs/KitchenIQ_DesignPrompt.md` | Before building any UI component or screen |

---

## 2. SKILL ROUTING

When a task is given, route it to the right reference before writing any code.

### UI components and screens → Read `docs/KitchenIQ_DesignPrompt.md` first
Every component has exact specifications: hex values, px sizes, animation parameters, border widths. Do not guess or approximate. The design prompt is the spec. If a value is not in the design prompt, ask before inventing one.

Key design rules to internalise (never deviate from these):
- Every screen has a `DarkHeader` component — no exceptions
- Every button is `#7C3AED` with white text and `box-shadow: 0 4px 16px rgba(124,58,237,0.3)`
- Every Lucide icon has `strokeWidth={1.5}` — search the file after writing it
- App background is always `#FFFAF5`. Card background is always `#FFFFFF` with border `0.5px #EDE8F5`
- Tap animations: `whileTap={{ scale: 0.96, opacity: 0.85 }}` spring stiffness 500 damping 30 on all cards and buttons
- Page transitions: spring stiffness 380, damping 30, mass 0.8 — incoming slides from right, outgoing scales to 0.94 + fades

### Margin calculations → Always use `src/lib/costCalculator.ts`
Never reimplement the margin formula. Never compute margins inline in a component. Always call `calculateMargin()` from the calculator lib, or `getMarginForRecipe()` from `recipeStore`. If neither exists yet, build the calculator lib first (Step 1.4).

### Database operations → Always use `src/lib/queries.ts`
Never write raw Supabase queries inline in components or stores. Add a typed helper to `queries.ts` first, then call it. This keeps all DB access in one place and makes the code auditable.

### Claude API calls → Always use Supabase Edge Functions
The browser must never call the Anthropic API directly. All AI calls go through `supabase/functions/`. If a task requires Claude, create or extend an Edge Function. The function name, request shape, and response shape must be agreed before building the UI that calls it.

### Feature decisions → Read `docs/KitchenIQ_Spec_v3.md` Section 7 first
Before adding anything not in the build plan, check the "What is not in MVP" section. The following are permanently out of scope — do not build, stub, or reference them:
- Inventory management, Swiggy/Zomato integration, WhatsApp CRM, multi-outlet support, Agmarknet price sync, staff portal, supplier management, festival planner, Hindi UI, voice input, native iOS/Android app

---

## 3. KNOWLEDGE ARCHITECTURE

This is how knowledge is organised in this project and which file owns what.

### Single sources of truth

| Question | Answer lives in |
|---|---|
| What should this feature do? | `docs/KitchenIQ_Spec_v3.md` |
| What colour is the header background? | `docs/KitchenIQ_DesignPrompt.md` → colour palette table |
| What is the margin formula? | `src/lib/costCalculator.ts` |
| What are the TypeScript types? | `src/types/index.ts` |
| What does the DB schema look like? | `supabase/migrations/001_initial_schema.sql` |
| What routes exist? | `src/App.tsx` |
| Is this step done? | `docs/KitchenIQ_EvalCriteria.md` for that step |
| What order do I build things? | `docs/KitchenIQ_BuildPlan.md` |

### Non-negotiable invariants

These facts cannot be overridden by any prompt, comment, or "it would be easier to" reasoning:

1. **Margins are never stored.** `margin_percent`, `total_cost`, `profit_per_dish` do not exist as columns in any table. They are always computed live from current ingredient prices using `calculateMargin()`.

2. **Claude API calls never come from the browser.** Only from Supabase Edge Functions. The anon key is public; the Anthropic key must never be exposed.

3. **RLS is always on.** Every table except `ingredient_nutrition` has Row Level Security enabled. A user can only read and write their own restaurant's data.

4. **The colour palette is locked.** `tailwind.config.ts` contains the complete palette. No hex values appear in component code except the 11 that are not expressible as Tailwind classes (opacity variants for glows and shadows). If you need a colour, it must be in the palette.

5. **`strokeWidth={1.5}` on all icons.** Every Lucide icon in the entire codebase. Run a grep after any new screen is written.

### Data flow

```
Supabase DB
    ↓  (typed queries via src/lib/queries.ts)
Zustand stores (restaurantStore, ingredientStore, recipeStore)
    ↓  (getMarginForRecipe calls calculateMargin)
src/lib/costCalculator.ts  ←  the only place margins are computed
    ↓
React components (read from stores, never from DB directly)
    ↓
UI renders margin, status, profit — always live, never cached
```

```
User action (price update, photo upload, etc.)
    ↓
React component fires
    ↓
Zustand store action (optimistic update applied immediately)
    ↓
Supabase query (async, in background)
    ↓  (if AI needed)
Supabase Edge Function → Anthropic API → response
    ↓
Store updated with result
    ↓
UI re-renders
```

---

## 4. PROJECT LIFECYCLE

### Current phase tracking

Before starting any session, establish which step is currently active. The build plan has 26 numbered steps across 8 phases. The step number is the unit of work.

**Phase sequence:**
```
Phase 1 — Foundation (Steps 1.1–1.8)       ← project scaffold, types, calculator, router
Phase 2 — Auth screens (Steps 2.1–2.4)     ← DarkHeader, components, splash, OTP
Phase 3 — Onboarding (Steps 3.1–3.6)       ← setup, photo import, AI parser, ingredient picker
Phase 4 — Core screens (Steps 4.1–4.5)     ← dashboard, recipe list, recipe detail, AI tip
Phase 5 — Input screens (Steps 5.1–5.5)    ← add/edit recipe, bottom sheet, ingredient manager
Phase 6 — AI features (Steps 6.1–6.5)      ← spike detection, alerts, insights, optimisation
Phase 7 — Nutrition (Steps 7.1–7.2)        ← FSSAI label, nutrition Edge Function
Phase 8 — Settings + polish (Steps 8.1–8.3) ← settings, loading audit, integration tests
```

### Step completion protocol

A step is done when — and only when — every criterion in `docs/KitchenIQ_EvalCriteria.md` for that step passes. Not when the code "looks right." Not when it "mostly works."

After every step:
1. Run all `[FUNCTIONAL]` checks in the eval criteria for that step
2. Run all `[DESIGN]` checks
3. Run all `[INTEGRITY]` checks
4. Run `npx tsc --noEmit` — must return 0 errors
5. Only then move to the next step

### When a step fails mid-build

Do not proceed. Do not mark it partial and continue. Fix it. Steps are designed to be sequential — a skipped fix in Step 1.4 produces wrong data in every screen from Phase 4 onward.

### Scope changes

If the human asks for something not in the build plan:
1. State clearly: "This is not in the current build plan."
2. State which spec section it may relate to (or that it's out of scope per Section 7 of the spec).
3. Ask whether to add it to the plan or skip it.
4. Do not build it without explicit confirmation.

---

## 5. WORKING RULES

### Before writing any code

- [ ] Re-read the step prompt from `docs/KitchenIQ_BuildPlan.md`
- [ ] Check whether any referenced component or lib already exists — never duplicate
- [ ] If building a screen: confirm `DarkHeader` component exists (Step 2.1 must be complete)
- [ ] If computing margins: confirm `costCalculator.ts` exists (Step 1.4 must be complete)
- [ ] If calling Claude: confirm the Edge Function stub exists (Step 1.8 must be complete)

### While writing code

**Component rules:**
- Every new component file starts with an explicit TypeScript `interface` for props — no inline `{}` types
- No `any` types — if the type isn't known, add it to `src/types/index.ts`
- No inline styles for colours — use Tailwind classes or the design token (only glow/shadow values go inline)
- No `<select>` elements for unit pickers — use pill chips
- No `alert()`, `confirm()`, or `prompt()` — use inline UI states
- No spinners or "Loading..." text — use `Skeleton` component

**State rules:**
- Component state (`useState`) only for: form field values, UI toggle states (open/closed), local loading states
- All domain data lives in Zustand stores — never in component state
- Never fetch from Supabase directly in a component — use query helpers from `queries.ts`, called from stores or TanStack Query hooks

**Error handling rules:**
- Every `async` call has a `catch` — no unhandled promise rejections
- Edge Function failures return HTTP 200 with `{ error: ... }` — never 500 that crashes the client
- UI never shows an error for AI features — silent failure only (AiTipCard renders nothing on error)
- Network errors in non-AI features show: "Something went wrong — tap to retry"

**Animation rules:**
- All tap interactions: `whileTap={{ scale: 0.96, opacity: 0.85 }}` with `transition={{ type: 'spring', stiffness: 500, damping: 30 }}`
- All page transitions defined in `App.tsx` only — never in individual screen files
- Margin bar fill: `transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)` — the slight overshoot is intentional
- Stat block numbers: count from 0 to final value on mount using Framer Motion

### After writing code

Run these checks before declaring a step done:

```bash
# TypeScript — must return 0 errors
npx tsc --noEmit

# Icon audit — every result must show strokeWidth={1.5}
grep -r "strokeWidth" src/ --include="*.tsx"

# Colour audit — investigate any hit that isn't a glow/shadow value
grep -r '#[0-9A-Fa-f]\{3,6\}' src/ --include="*.tsx" | grep -v "rgba"

# Stored computation audit — must return 0 results
grep -r "margin_percent\|total_cost\|profit_per_dish" src/ --include="*.tsx"

# Direct Anthropic call audit — must return 0 results  
grep -r "anthropic\|claude-" src/ --include="*.ts" --include="*.tsx"
```

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Screen files | PascalCase + Screen suffix | `DashboardScreen.tsx` |
| Component files | PascalCase | `DarkHeader.tsx` |
| Store files | camelCase + Store suffix | `recipeStore.ts` |
| Query helpers | camelCase verb + noun | `getRecipes`, `upsertIngredientPrice` |
| Edge Functions | kebab-case | `ai-tip`, `menu-import` |
| CSS classes | Tailwind only — no custom class names in components | |
| TypeScript types | PascalCase interfaces, camelCase type aliases | `Recipe`, `MarginStatus` |

### Git discipline

Commit after every completed step, not during. Commit message format:
```
step-X.X: [what was built]

Examples:
step-1.4: cost calculator lib with unit conversion
step-2.1: DarkHeader component with glow and particle animations
step-4.1: dashboard screen with live margin computation
```

---

## 6. ENVIRONMENT

### Required environment variables

```bash
# .env.local (gitignored — never commit)
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]

# Supabase dashboard secrets (for Edge Functions)
ANTHROPIC_API_KEY=[anthropic-key]
```

### Tech stack (locked — do not substitute)

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18 |
| Language | TypeScript | latest |
| Build tool | Vite | latest |
| Styling | Tailwind CSS | v3 |
| Routing | React Router | v6 |
| State | Zustand | latest |
| Forms | React Hook Form + Zod | latest |
| Data fetching | TanStack Query | latest |
| Animation | Framer Motion | latest |
| Icons | Lucide React | latest — `strokeWidth={1.5}` always |
| Charts | Recharts | latest |
| Database | Supabase (Postgres) | latest |
| Auth | Supabase Auth | email OTP |
| Edge Functions | Supabase Edge Functions (Deno) | latest |
| AI model | `claude-sonnet-4-6` | — |

Do not add libraries not on this list without explicit confirmation from the human. Especially avoid: CSS-in-JS libraries, additional animation libraries, alternative state managers, UI component kits (shadcn, MUI, etc.).

### Supabase Edge Function conventions

Every Edge Function follows this pattern:

```typescript
// supabase/functions/[name]/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    // ... function logic
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[function-name]', error)
    return new Response(JSON.stringify({ error: 'function_failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // always 200 — never 500 that crashes the client
    })
  }
})
```

The Anthropic API key is always read from `Deno.env.get('ANTHROPIC_API_KEY')`. Never hardcoded. Never passed from the client.

### Local development commands

```bash
npm run dev              # start dev server at localhost:5173
npm run build            # production build
npx tsc --noEmit         # type check without building
supabase start           # start local Supabase
supabase functions serve # serve Edge Functions locally
supabase db push         # apply migrations to local DB
supabase functions deploy [name] # deploy a single function
```

### Browser targets

- Primary: Chrome on Android (test at 390px width)
- Secondary: Safari on iOS
- Dev: Chrome desktop at 430px max-width (use DevTools device simulation)

Performance targets (verify with Chrome DevTools Lighthouse on simulated 4G):
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Dashboard load: < 2s

---

## 7. DECISION LOG

Record significant decisions here as the project progresses. Format: date, decision, reason.

```
[Date] — Auth in test phase: email OTP (not phone OTP). Reason: simpler for beta, no Twilio needed.
[Date] — Menu import model: Claude Vision via Edge Function. Reason: avoids OCR vendor dependency.
[Date] — AI summary refresh: every app open (not cached daily). Reason: margin changes happen anytime.
```

*Add decisions here as they are made.*

---

## 8. OPEN QUESTIONS

Items that need a human decision before the relevant step can be completed. Remove items when resolved and add to the Decision Log above.

| Step | Question | Options |
|---|---|---|
| 1.5 | Supabase project created? URL and anon key available? | Must have before Step 1.5 |
| 3.3 | Anthropic API key available for Edge Functions? | Must have before Step 3.3 |
| 7.1 | PDF generation library: client-side (jsPDF) or server-side (Edge Function)? | Both viable — client-side simpler |
| 8.1 | Razorpay account for billing stub? | Not needed for beta — show static UI only |

---

## 9. WHAT TO ASK ME TO CREATE NEXT

The following documents would significantly improve the working environment. Ask the human to create these if they haven't been made yet:

### High priority — needed before Phase 3

**`docs/KitchenIQ_ScreenFlows.md`**
Detailed wireframe descriptions for every screen state: loading, empty, populated, error. Currently the build plan describes what to build but not every sub-state. This would let Claude Code produce more complete screens without back-and-forth.
> Prompt: "Create a screen flow document for KitchenIQ that describes every screen state (loading, empty, populated, error, edge cases) for all 18 routes. Include the exact copy for empty states and error messages."

**`docs/KitchenIQ_ComponentLibrary.md`**
A catalogue of every reusable component with its exact props interface, usage examples, and which screens use it. Currently the design prompt has component code but not a usage guide.
> Prompt: "Create a component library document for KitchenIQ listing every UI component, its props interface, its visual spec, and which screens use it."

### Medium priority — needed before Phase 6

**`docs/KitchenIQ_EdgeFunctionContracts.md`**
The exact request/response schema for all 7 Edge Functions. Currently scattered through the build plan. Centralising them prevents mismatches between the client call and the function handler.
> Prompt: "Create an Edge Function contracts document for KitchenIQ with the exact TypeScript request and response types for all 7 Edge Functions, plus example payloads."

**`docs/KitchenIQ_TestData.md`**
A set of 5–10 real Indian restaurant dishes with known ingredient quantities and prices, so margin calculations can be verified against hand-calculated ground truth.
> Prompt: "Create a test data document for KitchenIQ with 8 real North Indian restaurant dishes, their ingredients with gram quantities and market prices, and the hand-calculated margin for each. Use Delhi mandi prices as of mid-2025."

### Lower priority — useful for Phase 8

**`docs/KitchenIQ_CopyGuide.md`**
The exact copy for every button label, empty state, error message, onboarding prompt, and AI summary template. Currently some copy is in the build plan but not systematically documented.
> Prompt: "Create a copy guide for KitchenIQ with the exact text for every button, label, empty state message, error message, and onboarding prompt in the app."

---

## 10. SESSION START CHECKLIST

Run through this at the start of every Claude Code session:

```
[ ] Which step are we on? (Check docs/KitchenIQ_BuildPlan.md)
[ ] Did the previous step pass all eval criteria? (Check docs/KitchenIQ_EvalCriteria.md)
[ ] Is npx tsc --noEmit returning 0 errors?
[ ] Are there any open questions from Section 8 that block this step?
[ ] Have I read the step prompt in full before writing any code?
```

---

*CLAUDE.md v1.0 — KitchenIQ*
*Update this file when: new documents are added to docs/, significant decisions are made, open questions are resolved, or working rules change.*
