# KitchenIQ — Glacier Redesign Build Plan
### Version 2.0 — Glacier Dark Theme
### Supersedes: KitchenIQ_BuildPlan.md (original v1 build)

---

## LOCKED DECISIONS

| Decision | Value |
|---|---|
| App background | `#0C111B` |
| Panel (cards) | `#161D2B` |
| Elevated (nested cards) | `#1B2436` |
| Card border | `1px rgba(255,255,255,0.08)` |
| Primary accent | `#3FC6F0` (cyan — replaces `#7C3AED` purple everywhere) |
| On-cyan text | `#04212E` |
| Text primary | `#F4F6FA` |
| Text secondary | `#9AA4B8` |
| Text faint | `#6B7588` |
| Healthy | `#36D399` on `rgba(54,211,153,0.14)` |
| Watch | `#F0A93F` on `rgba(240,169,63,0.14)` |
| Critical | `#F0596B` on `rgba(240,89,107,0.14)` |
| Logo | Text-only: "Kitchen" `#F4F6FA` + "IQ" `#3FC6F0`, weight 800, 18px |
| BottomNav tabs | Dashboard · Dishes · Autopilot · Alerts · More |
| AI images | `public/ai-images/` folder, referenced by path string (not imported) |
| Dish images | Styled placeholder — coloured circle with dish initial (no uploads) |
| Autopilot | AI Kitchen Intelligence using existing data. No POS. Kitchen feed = static image. |
| Dishes tabs | Performance + Pricing only (no Portfolio) |
| Margin target | Not included |
| Margin trend | 7-day sparkline approximated from `ingredient_price_history` |
| Inventory screen | Styled like image, shows price + staleness + delta %. No stock levels. |
| Recommendations | Hero card + list. No quadrant. |
| Settings | No new sections |
| Skipped | Reports screen, stock levels, dish photo upload, Portfolio tab, User Management, Notification Settings |
| New screens | AutopilotScreen, AlertsListScreen, MoreScreen, IntelligenceHubScreen |
| New Edge Function | `ai-ops-brief` |
| New DB fields | None |
| New DB queries | `getLatestPriceDelta(ingredientId)` in `queries.ts` |

---

## AUTOMATION RULES

These rules govern the entire build. They cannot be overridden.

1. **Never start a step until the previous step's full evaluation checklist passes.**
2. **Run the Base Audit after every step.** All 5 commands must pass before marking a step done.
3. **Two-failure rule:** If a step's evaluation fails twice on the same step after fixes, stop and ask the user what to do. Do not attempt a third fix autonomously.
4. **"Fail" is defined as:** any checklist item is false, any TypeScript error exists, or `npm run build` exits non-zero.
5. **Never skip a checklist item.** If a check is ambiguous, treat it as failing.
6. **Commit after each completed step** using the format: `step-RX: [description]`

### Base Audit (run after every step)
```bash
npx tsc --noEmit
npm run build
grep -rn "strokeWidth" src/ --include="*.tsx" | grep -v "strokeWidth={1.5}"
grep -rn "margin_percent\|total_cost\|profit_per_dish" src/ --include="*.tsx"
grep -rn "anthropic\|ANTHROPIC" src/ --include="*.ts" --include="*.tsx"
```
- Line 1: must exit code 0 — zero TypeScript errors
- Line 2: must exit code 0 — build succeeds
- Line 3: must return **zero lines** — all Lucide icons use `strokeWidth={1.5}`
- Line 4: must return **zero lines** — no computed values stored or referenced inline
- Line 5: must return **zero lines** — no direct Anthropic calls from frontend

---

## SCREEN INVENTORY

| # | Screen | Route | Status |
|---|---|---|---|
| 1 | LoadingScreen | `/` | Keep as-is — logic only, no UI |
| 2 | SplashScreen | `/login` | Redesign |
| 3 | OtpScreen | `/otp` | Redesign |
| 4 | RestaurantSetupScreen | `/setup` | Redesign |
| 5 | MenuImportScreen | `/onboarding/import` | Redesign |
| 6 | AiParserScreen | `/onboarding/parse` | Redesign |
| 7 | IngredientPickerScreen | `/onboarding/ingredients` | Redesign |
| 8 | DashboardScreen | `/dashboard` | Redesign + Gauge + Sales |
| 9 | RecipeListScreen | `/recipes` | Redesign + Performance/Pricing tabs |
| 10 | RecipeDetailScreen | `/recipes/:id` | Redesign + 7-day trend sparkline |
| 11 | AddRecipeScreen | `/recipes/new` | Redesign + AI-first hierarchy |
| 12 | EditRecipeScreen | `/recipes/:id/edit` | Redesign |
| 13 | IngredientManagerScreen | `/ingredients` | Redesign + delta % display |
| 14 | IngredientDetailScreen | `/ingredients/:id` | Redesign |
| 15 | RecommendationsScreen (was InsightsScreen) | `/insights` | Full redesign — hero + list |
| 16 | AlertDetailScreen | `/alerts/:id` | Redesign |
| 17 | NutritionScreen | `/recipes/:id/nutrition` | Redesign + dietary chip tabs |
| 18 | SettingsScreen | `/settings` | Redesign |
| 19 | AlertsListScreen | `/alerts` | NEW |
| 20 | AutopilotScreen | `/autopilot` | NEW |
| 21 | IntelligenceHubScreen | `/intelligence` | NEW |
| 22 | MoreScreen | `/more` | NEW |

---

## STEP R1 — Design System: Tokens · CSS · Routes · Assets

**Goal:** Establish the complete Glacier design foundation. Every subsequent step depends on this being correct.

### What to build

**1. Copy AI images to public folder**
Create `public/ai-images/` and copy from the glacier stack:
- `kitcheniq-glacier-stack/src/assets/login-kitchen-bg.png` → `public/ai-images/login-kitchen-bg.png`
- `kitcheniq-glacier-stack/src/assets/autopilot-kitchen-feed.png` → `public/ai-images/autopilot-feed.png`

**2. Update `tailwind.config.ts`**
Replace the entire `extend.colors` block with the Glacier palette. Keep all existing token names as aliases pointing to new values to avoid breaking changes mid-build:

```typescript
colors: {
  // Glacier core surfaces
  glacier: {
    base:          '#0C111B',
    panel:         '#161D2B',
    elevated:      '#1B2436',
    border:        'rgba(255,255,255,0.08)',
    'border-strong':'rgba(255,255,255,0.14)',
  },
  // Glacier text
  'gl-text':       '#F4F6FA',
  'gl-secondary':  '#9AA4B8',
  'gl-faint':      '#6B7588',
  // Glacier accent
  'gl-cyan':       '#3FC6F0',
  'gl-cyan-soft':  'rgba(63,198,240,0.14)',
  'gl-on-cyan':    '#04212E',
  // Status (Glacier variants)
  healthy: {
    DEFAULT:  '#36D399',
    soft:     'rgba(54,211,153,0.14)',
    // legacy aliases for existing components
    card:     'rgba(54,211,153,0.14)',
    badge:    'rgba(54,211,153,0.14)',
    'badge-text': '#36D399',
  },
  watch: {
    DEFAULT:  '#F0A93F',
    soft:     'rgba(240,169,63,0.14)',
    card:     'rgba(240,169,63,0.14)',
    badge:    'rgba(240,169,63,0.14)',
    'badge-text': '#F0A93F',
  },
  critical: {
    DEFAULT:  '#F0596B',
    soft:     'rgba(240,89,107,0.14)',
    card:     'rgba(240,89,107,0.14)',
    badge:    'rgba(240,89,107,0.14)',
    'badge-text': '#F0596B',
  },
  // AI card
  ai: {
    bg:   'rgba(63,198,240,0.14)',
    text: '#3FC6F0',
    icon: '#3FC6F0',
  },
  // Legacy aliases — keep so nothing breaks during transition
  brand: {
    action:        '#3FC6F0',
    'action-shadow':'rgba(63,198,240,0.25)',
  },
  bg: {
    base:   '#0C111B',
    card:   '#161D2B',
    header: '#0C111B',
  },
  border: {
    DEFAULT: 'rgba(255,255,255,0.08)',
    track:   'rgba(255,255,255,0.06)',
  },
  text: {
    primary:    '#F4F6FA',
    'on-dark':  '#F4F6FA',
    secondary:  '#9AA4B8',
    muted:      'rgba(255,255,255,0.36)',
    inactive:   '#6B7588',
  },
},
```

**3. Update `src/index.css`**
Replace the current `body` background and add Glacier keyframes:

```css
body {
  margin: 0;
  background: radial-gradient(circle at top, #102033 0%, #080b12 44%, #05070b 100%);
  background-attachment: fixed;
  color: #F4F6FA;
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Dark shimmer for Skeleton component */
@keyframes shimmer-dark {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Keep existing keyframes: breathe, drift1, drift2, drift3 */
/* These will be removed in R2 when GlacierHeader replaces DarkHeader */
/* but keep them now to avoid breaking existing screens */
```

**4. Update `src/App.tsx`**
- Change motion wrapper `backgroundColor` from `#FFFAF5` to `#0C111B`
- Add 4 new stub routes (each stub renders `<div style={{color:'#F4F6FA',padding:24}}>{routeName}</div>`):

```tsx
<Route path="/alerts" element={
  <ProtectedRoute><AlertsListScreen /></ProtectedRoute>
} />
<Route path="/autopilot" element={
  <ProtectedRoute><AutopilotScreen /></ProtectedRoute>
} />
<Route path="/intelligence" element={
  <ProtectedRoute><IntelligenceHubScreen /></ProtectedRoute>
} />
<Route path="/more" element={
  <ProtectedRoute><MoreScreen /></ProtectedRoute>
} />
```

Create stub files for the 4 new screens in `src/screens/`:
- `AlertsListScreen.tsx` — stub
- `AutopilotScreen.tsx` — stub
- `IntelligenceHubScreen.tsx` — stub
- `MoreScreen.tsx` — stub

### Evaluation checklist
- [ ] `public/ai-images/login-kitchen-bg.png` exists and is a valid PNG
- [ ] `public/ai-images/autopilot-feed.png` exists and is a valid PNG
- [ ] `tailwind.config.ts` contains `glacier`, `gl-cyan`, `gl-text`, `gl-secondary`, `gl-faint` tokens
- [ ] `tailwind.config.ts` healthy/watch/critical `DEFAULT` values are `#36D399` / `#F0A93F` / `#F0596B`
- [ ] `index.css` body background is the radial-gradient dark value
- [ ] `index.css` has `shimmer-dark` keyframe
- [ ] `App.tsx` motion wrapper `backgroundColor` is `#0C111B`
- [ ] All 4 new routes exist in `App.tsx` (`/alerts`, `/autopilot`, `/intelligence`, `/more`)
- [ ] All 4 stub screen files exist in `src/screens/`
- [ ] Navigating to `/autopilot` in browser renders the stub without crash
- [ ] Base audit passes

---

## STEP R2 — Component Library

**Goal:** Restyle all 11 existing components for Glacier dark theme. Build 3 new components. Restructure BottomNav. Replace DarkHeader with GlacierHeader across all screens.

### What to build

**New component: `src/components/ui/GlacierHeader.tsx`**

Replaces `DarkHeader`. Identical props interface. No background — inherits dark body. No glows, no spice dots. Transparent background (`background: transparent`).

```typescript
interface GlacierHeaderProps {
  title?: string
  subtitle?: string
  showBack?: boolean
  breadcrumb?: string
  leftElement?: ReactNode
  rightElement?: ReactNode
  children?: ReactNode
}
```

Layout: padding `14px 16px 20px`. Title: 21px weight 800 `#F4F6FA` letter-spacing `-0.4px`. Subtitle: 11px `#9AA4B8`. Back button: `ArrowLeft` size 16 `strokeWidth={1.5}` in `rgba(255,255,255,0.4)`, breadcrumb text 9px `rgba(255,255,255,0.4)`. Back row margin-bottom 8px when title present.

**New component: `src/components/ui/Gauge.tsx`**

SVG circular arc. 270° sweep (starts bottom-left, fills clockwise to bottom-right).

```typescript
interface GaugeProps {
  value: number        // 0–100
  size?: number        // default 190
  label?: string       // shown above value, e.g. "TOTAL MARGIN"
  sublabel?: string    // shown below value in green, e.g. "+4.2% vs LW"
}
```

SVG implementation:
- Viewbox: `0 0 {size} {size}`, cx/cy: `size/2`, radius r: `(size/2) - 14`
- Track circle: stroke `rgba(255,255,255,0.08)` strokeWidth 13 fill none
- Fill arc: stroke `#3FC6F0` strokeWidth 13 fill none strokeLinecap round
  - `strokeDasharray`: `2 * Math.PI * r`
  - `strokeDashoffset`: `2 * Math.PI * r * (1 - (value/100) * 0.75)` (75% of circle = 270°)
  - `transform="rotate(135 {cx} {cy})"` — starts at 135° (bottom-left)
- Center label text: 9px uppercase `#9AA4B8` at y = `cy - 18`
- Center value text: 34px weight 800 `#F4F6FA` at y = `cy + 8`
- Sublabel text: 12px weight 700 `#36D399` at y = `cy + 26`
- Animate arc fill on mount: Framer Motion animate `strokeDashoffset` from full offset to computed offset, spring stiffness 60 damping 20

**New component: `src/components/ui/Sparkline.tsx`**

```typescript
interface SparklineProps {
  data: number[]       // array of values, min 2 points
  color?: string       // default '#3FC6F0'
  height?: number      // default 46
  width?: string       // default '100%'
}
```

SVG path built from data array normalised to 0–1 range against min/max. Renders:
- Filled area path: same points + baseline, fill `{color}` at 12% opacity
- Line path: stroke `{color}` strokeWidth 2.5 strokeLinecap round fill none

**New component: `src/components/ui/DishPlaceholder.tsx`**

Coloured circle/square showing first letter of dish name. Used wherever dish images appear.

```typescript
interface DishPlaceholderProps {
  name: string         // dish name — first letter extracted
  size?: number        // default 48
  shape?: 'circle' | 'rounded'  // default 'circle'
}
```

Background colour: deterministic from dish name (hash first char to one of 6 palette colours: cyan-soft, green-soft, amber-soft, red-soft, and two more). Letter: uppercase, weight 800, size `size * 0.4`, colour = the solid version of the bg colour.

**Restyle existing components:**

`Button.tsx`:
- Primary: bg `#3FC6F0`, color `#04212E`, `box-shadow: 0 4px 16px rgba(63,198,240,0.25)`, border-radius 10px, font-weight 700, font-size 11px, padding `10px 16px`
- Ghost: bg `rgba(255,255,255,0.06)`, border `1px rgba(255,255,255,0.14)`, color `#F4F6FA`
- Keep all Framer Motion tap animations unchanged

`Card.tsx`:
- bg `#161D2B`, border `1px rgba(255,255,255,0.08)`, border-radius 16px, padding 16px
- Elevated variant: bg `#1B2436`
- Keep tap animation unchanged

`StatCard.tsx`:
- Healthy: bg `rgba(54,211,153,0.14)`, number `#36D399`, border `1px rgba(54,211,153,0.3)`
- Watch: bg `rgba(240,169,63,0.14)`, number `#F0A93F`, border `1px rgba(240,169,63,0.3)`
- Critical: bg `rgba(240,89,107,0.14)`, number `#F0596B`, border `1px rgba(240,89,107,0.3)`
- Label: 9px uppercase `#9AA4B8` (not colour-matched, always secondary)

`MarginBar.tsx`:
- Track: `rgba(255,255,255,0.08)`, height default 4px, border-radius 99px
- Healthy fill: `#36D399`, Watch: `#F0A93F`, Critical: `#F0596B`
- Keep cubic-bezier transition unchanged

`Skeleton.tsx`:
- Gradient: `linear-gradient(90deg, #1B2436 25%, #243046 50%, #1B2436 75%)`
- background-size: `200% 100%`, animation: `shimmer-dark 1.5s infinite`
- Remove the old light-purple gradient values

`StatusBadge.tsx`:
- Healthy: bg `rgba(54,211,153,0.14)`, text `#36D399`
- Watch: bg `rgba(240,169,63,0.14)`, text `#F0A93F`
- Critical: bg `rgba(240,89,107,0.14)`, text `#F0596B`
- Padding: `2px 8px`, border-radius 9999px, font-size 9px, font-weight 800, uppercase

`AiTipCard.tsx`:
- bg `rgba(63,198,240,0.14)`, border `1px rgba(63,198,240,0.25)`, border-radius 14px
- Icon color `#3FC6F0`, text color `#3FC6F0`, font-size 11px
- Loading: dark Skeleton
- Renders null if tip is null and not loading — unchanged

`Logo.tsx`:
- Remove icon/SVG entirely
- Render: `<div><span style={{color:'#F4F6FA'}}>Kitchen</span><span style={{color:'#3FC6F0'}}>IQ</span></div>`
- Font-size 18px, font-weight 800, letter-spacing `-0.3px`

`IngredientBottomSheet.tsx`:
- Sheet bg `#161D2B`, border-radius `20px 20px 0 0`
- Drag handle: `rgba(255,255,255,0.2)`, 4px height, 36px wide
- Overlay: `rgba(0,0,0,0.7)`
- Search input: bg `#1B2436`, border `1px rgba(255,255,255,0.14)`, text `#F4F6FA`, placeholder `#6B7588`
- Ingredient rows: bg `#1B2436`, divider `rgba(255,255,255,0.06)`
- Selected unit pill: bg `#3FC6F0`, text `#04212E`; unselected: bg `#0C111B`, border `rgba(255,255,255,0.14)`, text `#9AA4B8`
- Cost display: `#3FC6F0`
- Keep all logic (search, two-step flow, live cost calc) unchanged

**Restructure `BottomNav.tsx`:**

New 5 tabs:
```typescript
const tabs = [
  { label: 'Dashboard', path: '/dashboard',  Icon: Home           },
  { label: 'Dishes',    path: '/recipes',    Icon: UtensilsCrossed },
  { label: 'Autopilot', path: '/autopilot',  Icon: Zap            },
  { label: 'Alerts',    path: '/alerts',     Icon: Bell           },
  { label: 'More',      path: '/more',       Icon: MoreHorizontal  },
]
```

Style: floating pill, `position: fixed`, `bottom: 14px`, `left: 50%`, `transform: translateX(-50%)`, `width: calc(100% - 28px)`, `maxWidth: 402px`, `height: 66px`, `background: rgba(20,26,38,0.9)`, `backdropFilter: blur(8px)`, `WebkitBackdropFilter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.14)`, `borderRadius: 9999px`, `display: grid`, `gridTemplateColumns: repeat(5,1fr)`.

Active tab: icon + label `#3FC6F0`. Inactive: icon + label `#6B7588`. Label font-size 8px, font-weight 800 when active / 400 when inactive. Icon size 18. Keep Framer Motion tap animation.

Active detection: `/dashboard` → exact match. All others → `pathname.startsWith(path)`.

**Global find-and-replace `DarkHeader` → `GlacierHeader`:**

In every screen file that imports `DarkHeader`:
- Change import: `import DarkHeader from '../components/ui/DarkHeader'` → `import GlacierHeader from '../components/ui/GlacierHeader'`
- Change JSX: `<DarkHeader` → `<GlacierHeader`
- Props are identical — no other changes needed

Delete `src/components/ui/DarkHeader.tsx` after confirming all screens compile.

### Evaluation checklist
- [ ] `GlacierHeader.tsx` exists, `DarkHeader.tsx` is deleted
- [ ] `Gauge.tsx` exists — renders without crash when `value={28.6}`
- [ ] `Sparkline.tsx` exists — renders without crash when `data={[100,105,98,112,108,115]}`
- [ ] `DishPlaceholder.tsx` exists — renders a letter on a coloured background
- [ ] `Button` primary: background is `#3FC6F0` (inspect in DevTools)
- [ ] `Card`: background is `#161D2B`, border is `1px rgba(255,255,255,0.08)`
- [ ] `Skeleton`: shimmer uses dark gradient, not light purple
- [ ] `StatusBadge` healthy: background `rgba(54,211,153,0.14)`, text `#36D399`
- [ ] `AiTipCard`: background is cyan-soft, not purple (`#F5F0FA` must not appear)
- [ ] `Logo`: renders "Kitchen" + "IQ" text only, no icon SVG, IQ is cyan
- [ ] `IngredientBottomSheet`: selected unit pill is cyan bg + dark text
- [ ] `BottomNav`: exactly 5 tabs — Dashboard, Dishes, Autopilot, Alerts, More
- [ ] `BottomNav`: Autopilot tab uses `Zap` icon
- [ ] `BottomNav`: active tab colour is `#3FC6F0`, inactive is `#6B7588`
- [ ] `BottomNav`: pill shape with blur background visible in browser
- [ ] `grep -r "DarkHeader" src/` returns **zero results**
- [ ] `grep -r "GlacierHeader" src/screens/` returns a result for every screen file that previously used `DarkHeader`
- [ ] All existing screens still render without crash (open `/dashboard` in browser)
- [ ] Base audit passes

---

## STEP R3 — Auth Screens

**Goal:** Redesign SplashScreen and OtpScreen. No functional changes — all auth logic stays identical.

### SplashScreen (`/login`)

**Full layout (position relative, overflow hidden, min-height 100vh):**

```
<div> — full screen, position relative
  <img>
    src="/ai-images/login-kitchen-bg.png"
    position: absolute, inset 0, width 100%, height 100%, objectFit cover, opacity 0.8
  <div> — gradient overlay
    position: absolute, inset 0
    background: linear-gradient(to bottom, rgba(12,17,27,0.12) 0%, rgba(12,17,27,0.82) 52%, #0C111B 100%)
  <div> — content, position relative, padding: "360px 24px 40px"
    <Logo />  ← KitchenIQ brand text
    <p> "AI-Powered Margin Intelligence for Indian Restaurants"
        font-size 13px, color #9AA4B8, marginTop 10px, lineHeight 1.5
    <form> marginTop 32px
      <input>
        type="email", placeholder="your@email.com"
        bg #1B2436, border 1px rgba(255,255,255,0.14), borderRadius 12px
        padding "13px 16px", color #F4F6FA, fontSize 14px
        focus border #3FC6F0 (outline none, borderColor #3FC6F0)
        width 100%
      <Button> marginTop 12px, fullWidth, "Log In" — primary cyan
    <p> marginTop 28px, fontSize 11px, color #6B7588, display flex, alignItems center, gap 6px
      <Shield size={14} strokeWidth={1.5} />
      "Secure. Smart. Built for Indian kitchens."
```

Keep: React Hook Form registration, Zod email validation, `supabase.auth.signInWithOtp()` call, navigate to `/otp`.

### OtpScreen (`/otp`)

No GlacierHeader. Screen is full dark. Layout:

```
<div> — bg #0C111B, minHeight 100vh, padding "0 24px"
  <button> — back to /login, position absolute or top row
    <ArrowLeft size={16} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
  <div> — content, paddingTop 80px
    <h1> "Check your email"
         fontSize 28px, fontWeight 800, color #F4F6FA, letterSpacing -0.5px
    <p>  "We sent a 6-digit code to"
    <p>  {email} — color #3FC6F0, fontWeight 600
    <div> — OTP boxes row, marginTop 32px, display flex, gap 10px
      6 × <input>
            width 46px, height 56px, textAlign center
            fontSize 22px, fontWeight 800, color #F4F6FA
            bg #1B2436, border 1px rgba(255,255,255,0.14), borderRadius 12px
            active/focused border: #3FC6F0
    <div> — error message, color #F0596B, fontSize 12px, marginTop 12px
         (shake animation on wrong OTP — Framer Motion shakeX unchanged)
    <Button> marginTop 28px, fullWidth, "Verify" — primary cyan
    <p> marginTop 20px, fontSize 12px, color #6B7588, textAlign center
        "Didn't receive it?" + resend link/countdown — unchanged logic
```

Keep: all 6-digit input logic (auto-advance, backspace, clipboard paste), resend countdown (60s), `supabase.auth.verifyOtp()`, navigate to `/setup` or `/dashboard`.

### Evaluation checklist
- [ ] SplashScreen: background image (`/ai-images/login-kitchen-bg.png`) renders — visible in DOM as `<img>` tag
- [ ] SplashScreen: gradient overlay div is present in DOM
- [ ] SplashScreen: no saffron glow divs exist in DOM
- [ ] SplashScreen: email input has dark background (`#1B2436`), not warm cream
- [ ] SplashScreen: "Log In" button is cyan (`#3FC6F0`)
- [ ] SplashScreen: form submission calls `signInWithOtp` and navigates to `/otp`
- [ ] OtpScreen: no GlacierHeader component rendered — back arrow is a plain button
- [ ] OtpScreen: 6 input boxes render with dark bg and cyan focus ring
- [ ] OtpScreen: typing in box 1 auto-focuses box 2
- [ ] OtpScreen: verify button calls `verifyOtp` with assembled code
- [ ] OtpScreen: wrong code triggers shake animation
- [ ] OtpScreen: resend countdown decrements from 60
- [ ] Both screens: `#FFFAF5` and `#7C3AED` absent from rendered DOM
- [ ] Base audit passes

---

## STEP R4 — Onboarding Screens

**Goal:** Redesign all 4 onboarding screens to Glacier dark theme. Zero functional changes.

### Global rules for all 4 screens
- Background: `#0C111B` (body dark — no explicit bg needed if body is set)
- `GlacierHeader` on all screens
- All `<input>` fields: bg `#1B2436`, border `1px rgba(255,255,255,0.14)`, color `#F4F6FA`, placeholder `#6B7588`, focus border `#3FC6F0`, border-radius 12px, padding `12px 14px`
- All `<label>`: font-size 9px, uppercase, letter-spacing 0.06em, color `#6B7588`, font-weight 800
- All primary buttons: `Button` component (cyan)
- All ghost/skip buttons: `Button` variant ghost

### RestaurantSetupScreen (`/setup`)
- `GlacierHeader` title "Restaurant Setup"
- Form fields: dark input style above
- Cuisine type chips: unselected bg `#1B2436` border `rgba(255,255,255,0.14)` text `#9AA4B8`; selected bg `#3FC6F0` text `#04212E` border none
- FSSAI optional field: keep collapsible toggle, restyle toggle button to ghost outline
- Keep: all React Hook Form validation, `saveRestaurant()` call, navigate to `/onboarding/import`

### MenuImportScreen (`/onboarding/import`)
- `GlacierHeader` title "Import Menu"
- Upload zone: bg `#161D2B`, border `1px dashed rgba(255,255,255,0.2)`, border-radius 16px
- Phase: processing — dark `Skeleton` rows
- Dish review cards: `Card` component (dark), name input dark style, price input dark style, remove button `Trash2` in `#F0596B`
- Low-confidence flag: amber dot + "Please review" in `#F0A93F`
- Keep: all camera/file picker logic, Edge Function call, dish editing, confidence flagging, save flow

### AiParserScreen (`/onboarding/parse`)
- `GlacierHeader` title "AI Recipe Parser" showBack breadcrumb "Setup"
- Top AI input card: bg `rgba(63,198,240,0.14)`, border `1px rgba(63,198,240,0.25)`, border-radius 16px
  - `Sparkles` icon size 20 color `#3FC6F0`
  - Heading "Describe your dish" — `#F4F6FA`
  - Textarea: bg `#0C111B`, border `1px rgba(255,255,255,0.08)`, color `#F4F6FA`, placeholder `#6B7588`, borderRadius 10px, minHeight 100px
  - Example preset chips: bg `#1B2436`, border `rgba(255,255,255,0.1)`, text `#9AA4B8`, font-size 10px
  - "Parse with AI →" button: primary cyan
- Parsed result: ingredient cards with dark `Card`, unit selector pills (dark unselected, cyan selected)
- Live margin preview card: dark `Card`, margin % in status colour, label in `#9AA4B8`
- Keep: Edge Function call, ingredient editing, margin recalc, save + confirm flow

### IngredientPickerScreen (`/onboarding/ingredients`)
- `GlacierHeader` title "Select Ingredients"
- Search: dark input
- Category headers: 9px uppercase `#6B7588`
- Ingredient rows: bg `#161D2B` when unselected, bg `rgba(63,198,240,0.08)` when selected
- Checkbox: custom — empty circle `rgba(255,255,255,0.14)`, checked circle filled `#3FC6F0` with white tick
- Price input (inline, when selected): dark input style, small, right-aligned
- Selection count badge: bg `#3FC6F0`, text `#04212E`, border-radius 9999px, padding `2px 10px`, font-size 11px font-weight 800
- Keep: category grouping, search filter, bulk save, skip action

### Evaluation checklist
- [ ] All 4 screens: `GlacierHeader` rendered, no warm cream background visible
- [ ] All 4 screens: input fields dark bg (`#1B2436`), cyan focus ring
- [ ] RestaurantSetupScreen: selected cuisine chip is cyan
- [ ] MenuImportScreen: upload zone has dashed border on dark bg; dish edit cards are dark `Card`
- [ ] AiParserScreen: top AI card has cyan-soft background with Sparkles icon
- [ ] AiParserScreen: live margin preview updates when ingredients are adjusted
- [ ] IngredientPickerScreen: checked row shows cyan checkbox + cyan bg tint
- [ ] IngredientPickerScreen: selection count badge is cyan
- [ ] All 4 screens: functional flows work end-to-end (no broken submits or navigations)
- [ ] Base audit passes

---

## STEP R5 — DashboardScreen

**Goal:** Redesign Dashboard with Gauge component and estimated Sales/COGS. This is the most structurally changed core screen.

### New logic: estimated sales selector

Add to `src/stores/recipeStore.ts`:

```typescript
getEstimatedMonthlySales: () => {
  const { recipes, recipeIngredients } = get()
  const { ingredients } = useIngredientStore.getState()
  let totalSales = 0
  let totalCost = 0
  recipes.forEach(recipe => {
    const ingredientList = recipeIngredients[recipe.id] || []
    const result = calculateMargin({
      ingredients: ingredientList,
      sellingPrice: recipe.selling_price,
      serves: recipe.serves,
      wastagePercent: recipe.wastage_percent,
      overheadPercent: recipe.overhead_percent,
      ingredientPrices: Object.fromEntries(ingredients.map(i => [i.id, i.price_per_kg])),
    })
    totalSales += recipe.selling_price * 30   // 1 cover/day × 30 days
    totalCost  += result.totalCost * 30
  })
  return { sales: totalSales, cogs: totalCost }
},

getAggregateMargin: () => {
  const { sales, cogs } = get().getEstimatedMonthlySales()
  if (sales === 0) return 0
  return Math.max(0, Math.min(100, ((sales - cogs) / sales) * 100))
},
```

### Screen layout

```
Screen — paddingBottom 96px (BottomNav clearance)

GlacierHeader:
  leftElement: <Logo />
  rightElement: <Bell size={20} strokeWidth={1.5} color={hasSpike ? '#F0A93F' : '#6B7588'} />

Section: greeting
  "Good morning, {firstName} 👋"  — fontSize 22px, fontWeight 800, #F4F6FA
  "Here's how your kitchen is performing today."  — fontSize 11px, #9AA4B8, marginTop 2px

Section: stat row (3 columns, gap 8px, marginTop 16px)
  Each StatCard: status + count
  Uses count-up animation (Framer Motion) on mount — unchanged

Section: Gauge card (Card component, marginTop 14px, textAlign center)
  Label above: "TOTAL MARGIN" — 9px uppercase #9AA4B8
  <Gauge value={aggregateMargin} sublabel="+4.2% vs LW" />
  (sublabel is static "+0.0% vs LW" until historical data available)
  2-col grid below gauge:
    Left elevated card: "SALES" label (9px #9AA4B8) + formatted sales value (22px #F4F6FA) + "+12.4% vs LW" (10px #36D399, static)
    Right elevated card: "COGS" label + formatted cogs value + "+7.3% vs LW" (static)

Section: spike alert card (if ingredientStore.spikes.length > 0, not dismissed)
  bg rgba(240,89,107,0.14), border 1px rgba(240,89,107,0.3), borderRadius 14px, padding 14px
  Bold: "{ingredientName} prices up {changePercent}%"
  Small: "Tap for AI fix · impacting {affectedCount} dishes"
  Full card is tappable → navigate to /alerts

Section: AI summary card (Card, marginTop 12px)
  Row: <Sparkles size={16} strokeWidth={1.5} color="#3FC6F0" /> + "AI INSIGHT" label (9px uppercase #3FC6F0)
  Text: ai summary from Edge Function (11px #9AA4B8, lineHeight 1.6)
  Shows: <Skeleton height={14} /> × 2 while loading
  Shows: nothing if Edge Function fails (silent)

Section: dish list (marginTop 16px)
  Label: "YOUR MENU" — 9px uppercase #6B7588
  Each dish (Card, marginTop 8px, Framer Motion whileTap):
    Row: <DishPlaceholder name={dish.name} size={40} /> + name/category column + StatusBadge
    name: 13px fontWeight 700 #F4F6FA
    category · selling price: 10px #9AA4B8
    <MarginBar percent={margin.marginPercent} /> — marginTop 8px
    Row: "Margin {X.X}%" (11px #9AA4B8) + "₹{profit}/dish" (11px fontWeight 700, status colour)
  Sorted worst-first (lowest margin first)
  Tap → navigate to /recipes/:id

Empty state (0 dishes):
  Card, textAlign center, padding 32px
  "No dishes yet" — #9AA4B8
  <Button> "Add your first dish" → /recipes/new
```

Keep: pull-to-refresh, store connections, all existing data fetching.

### Evaluation checklist
- [ ] `getEstimatedMonthlySales()` exists in recipeStore and returns `{sales, cogs}` numbers
- [ ] `getAggregateMargin()` exists in recipeStore
- [ ] Gauge renders in Dashboard with the computed aggregate margin value
- [ ] Gauge arc animates on page mount (not instant)
- [ ] Sales card shows `₹X.XXL` formatted value derived from recipes
- [ ] COGS card shows `₹X.XXL` formatted value
- [ ] Stat tiles show correct counts (healthy/watch/critical) with count-up animation
- [ ] Stat tile counts match what recipeStore reports for current data
- [ ] Spike alert card appears when `ingredientStore.spikes` is non-empty
- [ ] Spike alert card taps to `/alerts`
- [ ] AI summary card shows Skeleton then text (or nothing silently on failure)
- [ ] Dish list is sorted lowest margin first
- [ ] Each dish card shows DishPlaceholder + name + MarginBar + status badge
- [ ] Tapping a dish card navigates to `/recipes/:id`
- [ ] Pull-to-refresh triggers `fetchRecipes` + `fetchIngredients`
- [ ] No `#7C3AED` or `#FFFAF5` in DOM
- [ ] Base audit passes

---

## STEP R6 — RecipeListScreen (Dishes)

**Goal:** Redesign Dishes screen with Performance and Pricing tabs.

### Layout

```
GlacierHeader:
  title: "Dishes"
  subtitle: dynamic tab context ("Performance view" / "Pricing view")
  rightElement: <Search icon /> — taps to expand search bar

Search bar (collapsible, below header):
  Appears/disappears with spring animation when search icon tapped
  Dark input, placeholder "Search dishes..."
  Filters dish list in real time

Tab bar (below search/header):
  2 tabs: "Performance" | "Pricing"
  Active: bg #3FC6F0 text #04212E, border-radius 8px, padding 8px 16px
  Inactive: bg transparent text #6B7588
  Tab bar bg: transparent, gap 4px, marginBottom 12px

Performance tab — each dish (Card, marginTop 8px):
  Row: <DishPlaceholder size={44} name={dish.name} shape="rounded" />
       name (13px 700 #F4F6FA) + category · price (10px #9AA4B8)
       <StatusBadge /> right-aligned
  <MarginBar /> marginTop 8px
  Row: "Margin {X.X}%" (11px #9AA4B8) + delta "±{X.X}%" (11px fontWeight 700, green if positive / red if negative)
  Tap → /recipes/:id

Pricing tab — each dish (Card, marginTop 8px):
  Row: <DishPlaceholder size={44} name={dish.name} shape="rounded" />
       name (13px 700 #F4F6FA) + category (10px #9AA4B8)
  3-col row (marginTop 10px):
    "SELLING" (9px #6B7588) + ₹{selling_price} (15px 700 #F4F6FA)
    "COST"    (9px #6B7588) + ₹{totalCost} (15px 700 #F4F6FA)
    "MARGIN"  (9px #6B7588) + ₹{profit} (15px 700, status colour)
  If reprice insight exists for dish: "Suggested: ₹{suggested}" in 10px #3FC6F0
  Tap → /recipes/:id

Empty state:
  Centred in screen, DishPlaceholder size=64 with "?" char, "No dishes yet" text, Add button

FAB (Floating Action Button):
  position fixed, bottom 90px (above BottomNav), right 20px
  Circle 52px, bg #3FC6F0, <Plus size={22} color="#04212E" strokeWidth={1.5} />
  Tap → /recipes/new
  whileTap scale 0.92
```

Delta % for Performance tab: approximate using `getSpikePercent` on the dish's total cost comparing ingredient prices at last-recorded vs current. If no history, show `—`.

Keep: all search filtering, store connections, navigation.

### Evaluation checklist
- [ ] Performance tab renders dish cards with DishPlaceholder, MarginBar, StatusBadge, delta %
- [ ] Pricing tab renders selling/cost/margin in 3-col layout
- [ ] Tab switch is animated (Framer Motion layout animation or opacity transition)
- [ ] Search icon tap reveals search input with animation
- [ ] Search filters dish list correctly by name
- [ ] FAB (+) is visible above BottomNav and navigates to `/recipes/new`
- [ ] Tapping any dish card in either tab navigates to `/recipes/:id`
- [ ] Empty state renders when 0 dishes
- [ ] Suggested price appears in Pricing tab for dishes with a reprice insight
- [ ] Base audit passes

---

## STEP R7 — RecipeDetailScreen

**Goal:** Redesign Dish Detail screen. Add 7-day margin trend sparkline.

### Margin trend calculation

New helper in `src/lib/costCalculator.ts`:

```typescript
export async function computeMarginTrend(
  recipe: Recipe,
  recipeIngredients: RecipeIngredient[],
  getPriceHistoryFn: (id: string, limit: number) => Promise<IngredientPriceHistory[]>
): Promise<number[]>  // returns 7 margin % values, oldest first
```

Algorithm:
1. For each of the 7 days (today - 6 through today), determine what each ingredient's price was.
2. For each ingredient, call `getPriceHistoryFn(ingredientId, 14)` — get up to 14 history records.
3. For each day, find the most recent price record ≤ that day. If none: use current price.
4. Run `calculateMargin()` with those prices.
5. Return array of 7 margin % values.

This is called once on mount and cached in component state. Loading shows Skeleton.

### Layout

```
Screen — no GlacierHeader

Top row (padding 16px, marginTop 14px):
  <ArrowLeft size={18} strokeWidth={1.5} color="rgba(255,255,255,0.4)" /> navigate(-1)
  "Recipes" — 11px #9AA4B8
  Right: <MoreVertical size={18} strokeWidth={1.5} color="#9AA4B8" /> (edit/delete menu)

Dish photo row (padding 0 16px, marginTop 16px):
  <DishPlaceholder name={dish.name} size={88} shape="circle" />
  Right column:
    <StatusBadge status={marginResult.status} />
    dish name — 21px 800 #F4F6FA
    "{category} · serves {serves}" — 11px #9AA4B8

Margin hero card (Card, marginTop 14px):
  "Margin" — 9px uppercase #9AA4B8
  {margin%} — 42px 800, colour = status colour, count-up animation on mount
  "+{delta}% vs LW" — 11px #36D399 (static until historical data)
  <MarginBar percent={margin%} height={5} /> marginTop 10px
  3-col row below bar:
    Selling Price: label 9px #6B7588 + ₹{price} 14px 700 #F4F6FA
    Food Cost:     label 9px #6B7588 + ₹{cost} 14px 700 #F4F6FA
    Margin ₹:      label 9px #6B7588 + ₹{profit} 14px 700, status colour

AI Tip card (AiTipCard component — only if status is watch or critical):
  marginTop 12px
  Shows Skeleton while loading, null if no tip and not loading

7-Day Margin Trend (Card, marginTop 12px):
  Row: "Margin Trend" (12px 700 #F4F6FA) + "7 Days ▾" (10px #9AA4B8)
  <Sparkline data={trendData} color={statusColour} height={56} />
  Shows 3× <Skeleton height={56} /> while computing trend
  Shows nothing if trend computation fails (silent)

Cost breakdown (Card, marginTop 12px):
  Title: "Cost Breakdown" 12px 700 #F4F6FA
  4 rows separated by rgba(255,255,255,0.06) dividers:
    "Raw ingredients" + ₹{rawCost}
    "Wastage ({wastage%}%)" + ₹{wastageCost}
    "Overhead ({overhead%}%)" + ₹{overheadCost}
    "Total / portion" + ₹{totalCost} (fontWeight 800, #F4F6FA)
  Label: 11px #9AA4B8, value: 11px 700 #F4F6FA

Ingredient list (Card, marginTop 12px):
  Title: "Ingredients by cost"
  Each row: ingredient name (11px #F4F6FA) + ₹{cost}/portion (11px 700, status colour)
  Sorted highest cost first, dividers between rows

Action row (marginTop 20px, marginBottom 20px, 2 buttons):
  "Edit Recipe" — Button ghost, flex 1
  "View Nutrition" — Button primary cyan, flex 1
```

Keep: all data fetching, margin calculation, AI tip fetching, navigation.

### Evaluation checklist
- [ ] No GlacierHeader — back arrow is a plain row element
- [ ] DishPlaceholder renders with correct size (88px circle)
- [ ] Margin % animates count-up from 0 on mount
- [ ] Margin colour matches status (green/amber/red)
- [ ] AiTipCard renders only for watch or critical status — not healthy
- [ ] 7-day trend Sparkline renders after computation completes
- [ ] Sparkline shows skeleton (3 skeleton rows) while computing
- [ ] `computeMarginTrend` function exists in `costCalculator.ts`
- [ ] Cost breakdown shows all 4 rows with correct calculated values
- [ ] "Edit Recipe" navigates to `/recipes/:id/edit`
- [ ] "View Nutrition" navigates to `/recipes/:id/nutrition`
- [ ] Base audit passes

---

## STEP R8 — AddRecipeScreen + EditRecipeScreen

**Goal:** Redesign both screens. Flip AddRecipe visual hierarchy so AI parser is primary.

### AddRecipeScreen (`/recipes/new`)

```
GlacierHeader title "Add Recipe"

AI Parser card (primary, top):
  bg rgba(63,198,240,0.14), border 1px rgba(63,198,240,0.3), borderRadius 16px, padding 16px, marginTop 16px
  Row: <Sparkles size={20} strokeWidth={1.5} color="#3FC6F0" /> + "AI Recipe Parser" (14px 700 #F4F6FA)
  Italic example text: "Dal Makhani — 200g urad dal, 60g cream..." (11px #9AA4B8, marginTop 6px)
  <Button> "Parse with AI →" fullWidth marginTop 12px — primary cyan
  Tap → navigate to /onboarding/parse

Divider row: line — "or fill manually" — line (9px #6B7588, lines are rgba(255,255,255,0.08))

Manual form section:
  All fields with dark input style (same as R4)
  Dish name — full width input
  Category chips row — same pill chip style as RestaurantSetupScreen
  2-col row: Selling price (₹ prefix in #6B7588) | Serves (number input)
  2-col row: Wastage % | Overhead %
  
Ingredients section:
  "Ingredients" label + "Add" button (ghost, small, <Plus size={14} />)
  Each added ingredient: Card elevated, name + quantity/unit + ₹cost + remove button
  "Add ingredient" → opens IngredientBottomSheet

Live margin preview (Card, marginTop 12px):
  Only visible once ≥1 ingredient added AND selling price > 0
  Margin % in status colour (large, 28px 800)
  "Healthy · ₹{profit}/dish" or Watch/Critical equivalent
  Animates colour change when status changes

Save button: "Save Recipe" — primary cyan, full width, marginTop 16px, marginBottom 24px
```

Keep: React Hook Form, Zod schema, all validation, IngredientBottomSheet interaction, `getRecipes()` refetch, navigate to `/recipes/:id` after save.

### EditRecipeScreen (`/recipes/:id/edit`)

Same layout as AddRecipeScreen except:
- No AI parser card at top
- Title: "Edit Recipe"
- Pre-populated with existing recipe data (loading shows Skeleton for each field)
- Header rightElement: 2 icon buttons — `Copy` (duplicate) + `Trash2` (delete)
- Delete: shows inline confirmation card (not modal) — "Delete this dish? This cannot be undone." with "Cancel" + "Delete" (red) buttons
- Duplicate: creates copy with name "Copy of {name}", navigates to new recipe

Keep: all pre-populate logic, `updateRecipe()`, `deleteRecipe()`, `duplicateRecipe()` calls.

### Evaluation checklist
- [ ] AddRecipeScreen: AI parser card appears above the form divider
- [ ] AddRecipeScreen: "Parse with AI →" navigates to `/onboarding/parse`
- [ ] AddRecipeScreen: manual form below divider has all 6 fields
- [ ] AddRecipeScreen: category chips are pill-shaped, selected shows cyan
- [ ] AddRecipeScreen: live margin preview card appears once ingredient + price added
- [ ] AddRecipeScreen: margin preview colour changes as data changes
- [ ] AddRecipeScreen: submitting form saves to Supabase and navigates to new recipe detail
- [ ] EditRecipeScreen: no AI parser card
- [ ] EditRecipeScreen: fields pre-populated with existing data
- [ ] EditRecipeScreen: Trash2 icon shows inline delete confirmation (no `confirm()` dialog)
- [ ] EditRecipeScreen: Copy icon creates duplicate recipe
- [ ] IngredientBottomSheet opens with dark styling from both screens
- [ ] Base audit passes

---

## STEP R9 — IngredientManagerScreen + IngredientDetailScreen

**Goal:** Redesign both screens. Add delta % to IngredientManager. Dark Recharts chart on Detail.

### New query helper

Add to `src/lib/queries.ts`:

```typescript
export async function getLatestPriceDelta(ingredientId: string): Promise<number | null> {
  try {
    const { data } = await supabase
      .from('ingredient_price_history')
      .select('price_per_kg, recorded_at')
      .eq('ingredient_id', ingredientId)
      .order('recorded_at', { ascending: false })
      .limit(2)
    if (!data || data.length < 2) return null
    return getSpikePercent(data[1].price_per_kg, data[0].price_per_kg)
  } catch { return null }
}
```

### IngredientManagerScreen (`/ingredients`)

Styled to match Inventory screen look from design image.

```
GlacierHeader:
  title "Inventory"   ← note: display name changes to "Inventory" to match image
  rightElement: <Plus icon button> → opens inline add form

Search bar (always visible, below header):
  Dark input, placeholder "Search ingredients..."

Filter tabs: "All" | "Stale" (only 2 tabs — we have price/staleness not stock levels)
  Active: bg #3FC6F0 text #04212E; Inactive: text #6B7588
  "Stale" tab: filters ingredients where last_updated > 7 days ago

Inline add form (collapsible, animates in):
  Name input + price input + unit selector chips + Save button
  Same dark style

Ingredient list (each row is a Card, marginTop 8px):
  Left: ingredient icon (circle with first letter, 36px) + name (13px 700 #F4F6FA) + unit (10px #9AA4B8) below
  Right column (text-align right):
    Price: "₹{price}/kg" — 14px 700 #F4F6FA
    Delta: "+{X}%" in #F0A93F (price rose) | "-{X}%" in #36D399 (price fell) | "—" if no history
    Below delta: "{N} days ago" in 10px #6B7588 (staleness)
  Stale row (>7 days): amber tint — bg rgba(240,169,63,0.06), border rgba(240,169,63,0.2)
  Tap row → /ingredients/:id

Stale alert banner (above list, if any stale ingredients):
  bg rgba(240,169,63,0.14), border rgba(240,169,63,0.3)
  "{N} ingredient prices may be outdated — last updated over 7 days ago"
  font-size 11px, color #F0A93F
```

Delta % loaded via `getLatestPriceDelta()` for each ingredient on mount. Cache in component state using a `Record<id, number|null>` map. Load in parallel with `Promise.all`. Show `—` skeleton while loading per row.

### IngredientDetailScreen (`/ingredients/:id`)

```
Top row (padding 16px):
  <ArrowLeft /> navigate(-1) + "Inventory" breadcrumb

Ingredient name — 24px 800 #F4F6FA, marginTop 8px

Price card (Card, marginTop 14px):
  "CURRENT PRICE" — 9px uppercase #9AA4B8
  View mode: ₹{price}/kg — 36px 800 #F4F6FA + pencil icon button
  Edit mode: dark input (pre-filled) + "Save" (cyan) + "Cancel" (ghost) — inline

Price history chart (Card, marginTop 12px):
  Title: "Price History"
  Recharts LineChart:
    - backgroundColor: transparent (chart bg matches card bg #161D2B)
    - Line stroke: #3FC6F0
    - Dot fill: #3FC6F0
    - CartesianGrid stroke: rgba(255,255,255,0.06)
    - XAxis tick fill: #6B7588, fontSize 10
    - YAxis tick fill: #6B7588, fontSize 10
    - Tooltip: bg #1B2436, border rgba(255,255,255,0.14), text #F4F6FA
  Height: 140px

Affected dishes (Card, marginTop 12px):
  Title: "Dishes using this ingredient"
  Each row:
    Dish name (12px 700 #F4F6FA) + category (10px #9AA4B8)
    Old margin StatusBadge → arrow → new margin StatusBadge
    "→" shows if price changed

Spike alert (Card amber-tinted, marginTop 12px, only if active spike):
  "Price spike detected" heading
  "{change}% change from ₹{old} to ₹{new}"
  "View AI recommendations →" → navigate to /alerts/{spikeId}
```

Keep: inline price edit save logic, `upsertIngredientPrice()`, spike detection trigger in store.

### Evaluation checklist
- [ ] `getLatestPriceDelta` exists in `queries.ts` and returns a number or null
- [ ] IngredientManagerScreen: screen title displays "Inventory"
- [ ] IngredientManagerScreen: each ingredient row shows delta % (colour-coded or "—")
- [ ] IngredientManagerScreen: stale rows have amber tint
- [ ] IngredientManagerScreen: "Stale" filter tab shows only ingredients with last_updated > 7 days
- [ ] IngredientManagerScreen: delta values load from `getLatestPriceDelta` (not hardcoded)
- [ ] IngredientDetailScreen: price chart has dark bg + cyan line (no white chart bg)
- [ ] IngredientDetailScreen: inline price edit saves via `upsertIngredientPrice()`
- [ ] IngredientDetailScreen: saving a price ≥15% change triggers spike detection in store
- [ ] IngredientDetailScreen: spike card appears when spike is active for this ingredient
- [ ] Base audit passes

---

## STEP R10 — RecommendationsScreen

**Goal:** Full redesign of InsightsScreen as "Recommendations". Hero card + list layout. No quadrant.

### Layout

```
GlacierHeader:
  title "Recommendations"
  subtitle: "{restaurantName} · AI insights"
  rightElement: refresh icon button (rate-limited weekly — unchanged logic)

TOP RECOMMENDATION card (Card cyan-soft, marginTop 16px):
  Label row: <Sparkles size={16} strokeWidth={1.5} color="#3FC6F0" /> "TOP RECOMMENDATION" (9px uppercase #3FC6F0)
  Content (row layout):
    Left column (flex 1):
      Action text: "Increase price of {dishName} by ₹{amount}" — 18px 800 #F4F6FA, marginTop 8px
      "New Price: ₹{suggestedPrice}" — 12px #9AA4B8
      "Potential Margin: {margin}%" — 12px #36D399
      "Potential Uplift: +₹{uplift}/day" — 12px fontWeight 700 #36D399
    Right: <DishPlaceholder name={dishName} size={80} shape="circle" />
  <Button> "Apply Recommendations" fullWidth marginTop 16px — primary cyan
    On tap: calls `applyReprice()` for top recommendation, shows success state

  Loading: 3 Skeleton rows
  Empty: "No recommendations yet — AI analyses your menu weekly" in #9AA4B8, textAlign center

  Top recommendation logic:
    Query `getMenuInsights(restaurantId)`, filter type='reprice', sort by suggested price delta descending
    Pick first result — this is the top recommendation

OTHER RECOMMENDATIONS (marginTop 20px):
  Label "OTHER RECOMMENDATIONS" — 9px uppercase #6B7588

  Each insight as a row (Card, marginTop 8px):
    Left: icon based on type
      reprice → TrendingUp, color #3FC6F0
      promote → Star, color #36D399
      remove  → Trash2, color #F0596B
    Centre: insight message text (12px #F4F6FA, lineHeight 1.5)
    Right: <ChevronRight size={16} strokeWidth={1.5} color="#6B7588" />
    Tap: for reprice — inline expand with "Apply ₹{price}" button; for others — navigate to /insights (legacy detail if needed)

  Group by type (Reprice / Promote / Consider Removing) with section labels above groups
  Empty: "All recommendations applied — check back next week"
```

Keep: `getMenuInsights()` query, `applyReprice()` call, weekly refresh rate-limit.

### Evaluation checklist
- [ ] Top recommendation card shows dish name, suggested price, potential margin, uplift
- [ ] Top recommendation card has DishPlaceholder on the right
- [ ] "Apply Recommendations" button calls `applyReprice()` and shows success state
- [ ] Loading state shows Skeleton rows
- [ ] Empty state renders if no insights
- [ ] Other recommendations list groups by type (Reprice/Promote/Remove)
- [ ] Reprice row inline expand shows apply button
- [ ] Refresh button is present in header
- [ ] No quadrant, no price slider — simpler layout
- [ ] Base audit passes

---

## STEP R11 — AlertDetailScreen + AlertsListScreen (new)

**Goal:** Redesign AlertDetailScreen. Build new AlertsListScreen for `/alerts` route.

### AlertsListScreen (`/alerts`) — NEW SCREEN

Data sources:
- Price spikes: `ingredientStore.spikes` (filter out `dismissedSpikeIds`)
- AI insights: `getMenuInsights(restaurantId)` — all active types
- Daily summary: last entry from `ai_tips` or a static INFO entry based on last `ai-dashboard-summary` call timestamp

```
GlacierHeader:
  title "Alerts"
  rightElement: "Today ▾" — static label (no real date filtering needed for MVP)

Filter tabs: All | Critical | Watch | Info
  Active: bg #3FC6F0 text #04212E
  Inactive: text #6B7588

Alert list (sorted by severity then time, newest first):

  CRITICAL type alerts:
    Source: ingredientStore.spikes (undismissed) + recipes where status=critical
    Card: bg rgba(240,89,107,0.14), border rgba(240,89,107,0.3), borderRadius 14px
    Left: warning triangle icon #F0596B
    Dish/ingredient name — 13px 700 #F4F6FA
    Message — 11px #9AA4B8 (e.g. "Margin dropped to 12.7% · ₹48 below target")
    Timestamp — 10px #6B7588 right-aligned
    Tap → /alerts/:id (AlertDetailScreen)

  WATCH type alerts:
    Source: recipes where status=watch + price changes <15%
    Card: bg rgba(240,169,63,0.14), border rgba(240,169,63,0.3)
    Left: alert-circle icon #F0A93F
    Same layout as Critical

  INFO type alerts:
    Source: static entry — "Daily Summary · All key metrics updated"
    Timestamp: last AI summary call time (stored in component state, defaults to "Today")
    Card: bg rgba(63,198,240,0.08), border rgba(63,198,240,0.14)
    Left: info icon #3FC6F0
    No tap action — or tap shows AI summary in a bottom sheet

Filter logic:
  All: shows all three types
  Critical: shows only CRITICAL
  Watch: shows only WATCH
  Info: shows only INFO

Empty state per filter:
  "No {filter} alerts" with checkmark icon
```

### AlertDetailScreen (`/alerts/:id`) — redesign only

```
Top row: <ArrowLeft /> navigate(-1) + "Alerts" breadcrumb

Alert header card (amber tinted, marginTop 16px):
  Ingredient name — 18px 800 #F4F6FA
  Price change: "₹{old}/kg → ₹{new}/kg" with arrow icon (#F0A93F)
  Change %: "+{X}%" badge in #F0A93F

Affected recipes section:
  Label "AFFECTED DISHES" — 9px uppercase #6B7588
  Each dish card (Card, marginTop 8px):
    Dish name (13px 700) + category (10px #9AA4B8)
    Old StatusBadge + "→" + New StatusBadge
    AI recommendation text (11px italic #9AA4B8, marginTop 8px, if loaded)
    2 buttons: "Update Price" (ghost) | "View Dish" (ghost)

Dismiss button (full width, ghost, marginTop 16px, marginBottom 24px):
  "Dismiss Alert" — calls dismissSpike/dismissInsight
```

Keep: AI recommendations fetch, dismiss logic, navigation.

### Evaluation checklist
- [ ] `/alerts` route renders AlertsListScreen
- [ ] AlertsListScreen: CRITICAL alerts show in red-tinted cards
- [ ] AlertsListScreen: WATCH alerts show in amber-tinted cards
- [ ] AlertsListScreen: INFO alert shows in cyan-tinted card
- [ ] AlertsListScreen: filter tabs correctly hide/show alert types
- [ ] AlertsListScreen: tapping a critical/watch alert navigates to `/alerts/:id`
- [ ] AlertsListScreen: empty state renders per filter when no alerts of that type
- [ ] AlertDetailScreen: amber header card shows ingredient + price change
- [ ] AlertDetailScreen: affected dish cards show StatusBadge transition
- [ ] AlertDetailScreen: dismiss removes spike from store and updates DB
- [ ] Base audit passes

---

## STEP R12 — NutritionScreen + SettingsScreen

**Goal:** Redesign both screens. Dietary tags become chip tabs on Nutrition.

### NutritionScreen (`/recipes/:id/nutrition`)

```
GlacierHeader: showBack, breadcrumb = dishName, title "Nutrition Label"
Subtitle: "FSSAI-ready · per 100g and per serve"

State: Empty
  Card (cyan-soft tint), textAlign center, padding 32px
  Calculator icon (36px, #3FC6F0)
  "Generate Nutrition Label" — 15px 700 #F4F6FA
  "AI analyses your ingredients against IFCT 2017 data" — 11px #9AA4B8
  <Button> "Calculate" — primary cyan, marginTop 16px, fullWidth

State: Loading
  4 Skeleton rows (height 16px, varying widths)

State: Result
  Dietary chip tabs (horizontal scroll, gap 8px, marginBottom 16px):
    Each detected tag: bg rgba(63,198,240,0.14) border rgba(63,198,240,0.3) color #3FC6F0
    Each non-detected tag: bg #1B2436 border rgba(255,255,255,0.08) color #6B7588
    Tags: Vegetarian | Non-Veg | Vegan | Jain | Gluten-Free | High Protein
    (multiple can be active simultaneously — they are informational, not filters)

  Nutrition table (Card):
    Header row: "Nutrient" | "Per 100g" | "Per Serve" — 9px uppercase #6B7588
    7 data rows: Energy, Protein, Total Fat (+ Saturated Fat indented), Carbohydrate (+ Sugars indented), Dietary Fibre, Sodium
    Row text: 11px #F4F6FA label + values; divider rgba(255,255,255,0.06)
    "AI estimate" footnote if is_ai_estimate: 10px italic #9AA4B8 at bottom of card

  Action row (marginTop 14px, gap 8px):
    "Download PDF" — Button primary cyan, flex 1
    "Share" — Button ghost, flex 1 (WhatsApp stub — unchanged)
```

Keep: nutrition fetch, dietary tag detection logic, jsPDF generation.

### SettingsScreen (`/settings`)

```
GlacierHeader: title "Settings & Profile"

Profile card (Card, marginTop 16px):
  Avatar circle (48px, bg #3FC6F0, first letter of owner name in #04212E, 20px 800)
  Owner name — 16px 700 #F4F6FA
  Email — 12px #9AA4B8

Section: "ACCOUNT" (9px uppercase #6B7588, marginTop 20px)
  SettingsRow: "Restaurant Profile" → inline edit (existing logic)
  SettingsRow: "Cuisine Type" → chip select (existing logic)

Section: "APP" (9px uppercase #6B7588, marginTop 20px)
  SettingsRow: "Plan" → "Beta — Free" badge (cyan-soft bg, cyan text)
  SettingsRow: "Export Recipes" → CSV download (existing)
  SettingsRow: "Export Ingredients" → CSV download (existing)

Section: "SUPPORT" (9px uppercase #6B7588, marginTop 20px)
  SettingsRow: "Help & Support" → static (no action for now)
  SettingsRow: "About KitchenIQ" → shows version + "Built for Indian restaurants"

Logout row (marginTop 20px, marginBottom 32px):
  bg rgba(240,89,107,0.08), border rgba(240,89,107,0.2), borderRadius 14px, padding 14px
  <LogOut size={18} strokeWidth={1.5} color="#F0596B" /> "Log out" — 13px 700 #F0596B
  Tap: clear all stores + supabase.auth.signOut() + navigate to /login

SettingsRow component (internal, not exported):
  height 52px, display flex, alignItems center, justifyContent space-between
  padding 0 2px, divider rgba(255,255,255,0.06) between rows
  Left: icon (optional, 18px #6B7588) + label (13px #F4F6FA)
  Right: value text (12px #9AA4B8) + <ChevronRight size={16} color="#6B7588" />
  Inline edit: label stays, right becomes input + save/cancel
```

Keep: all inline edit logic, CSV export, sign out.

### Evaluation checklist
- [ ] NutritionScreen: empty state shows cyan calculate card
- [ ] NutritionScreen: loading shows Skeleton rows
- [ ] NutritionScreen: dietary chips — detected tags show cyan-tinted, undetected show dark
- [ ] NutritionScreen: multiple dietary tags can be active simultaneously
- [ ] NutritionScreen: FSSAI table shows 7 nutrients with per-100g and per-serve columns
- [ ] NutritionScreen: "AI estimate" footnote shows when `is_ai_estimate` is true
- [ ] NutritionScreen: PDF download triggers jsPDF generation
- [ ] SettingsScreen: profile avatar shows owner initial on cyan bg
- [ ] SettingsScreen: "Restaurant Profile" row inline edit works — saves to Supabase
- [ ] SettingsScreen: CSV export buttons trigger downloads
- [ ] SettingsScreen: logout clears stores + signs out + redirects to `/login`
- [ ] SettingsScreen: logout button has red tint (not purple)
- [ ] Base audit passes

---

## STEP R13 — Edge Function `ai-ops-brief` + AutopilotScreen (new)

**Goal:** Build the Autopilot screen as an AI Kitchen Intelligence hub using existing data.

### New Edge Function: `supabase/functions/ai-ops-brief/index.ts`

Follows the standard Edge Function pattern from CLAUDE.md.

**Request shape:**
```typescript
{
  restaurantId: string
  restaurantName: string
  criticalDishes: Array<{ name: string; margin: number; }>
  staleIngredients: Array<{ name: string; daysSinceUpdate: number; }>
  activeSpikes: Array<{ ingredientName: string; changePercent: number; }>
}
```

**Response shape:**
```typescript
{
  headline: string          // 1 punchy line, e.g. "2 dishes need price fixes tonight"
  actions: string[]         // 2–3 specific actionable items
  urgency: 'high' | 'medium' | 'low'
}
```

**Claude prompt:** System prompt instructs Claude to act as a restaurant operations advisor. Given the critical dishes, stale prices, and spikes, generate a brief ops summary the owner can act on before service. Keep it under 40 words total. Always name specific dishes. Never be generic.

Cache result in `ai_insights` table with type `'ops_brief'` and `expire_at = now() + 4 hours`. On the client, check cache before calling Edge Function.

Add `'ops_brief'` to the `InsightType` union in `src/types/index.ts`.

### AutopilotScreen (`/autopilot`)

```
GlacierHeader:
  title "Operations Autopilot"
  rightElement: <span style={{bg:'rgba(54,211,153,0.14)', color:'#36D399', borderRadius:9999, padding:'2px 8px', fontSize:10, fontWeight:800}}>● LIVE</span>
  subtitle: "Kitchen feed · {currentTime}"

Kitchen feed (full-width image, height 180px, borderRadius 16px, marginTop 14px):
  <img src="/ai-images/autopilot-feed.png" style={{width:'100%', height:180, objectFit:'cover', borderRadius:16}} />
  Overlay gradient bottom: rgba(12,17,27,0) → rgba(12,17,27,0.6)

AI Operations Brief card (Card cyan-soft, marginTop 14px):
  Label row: <Sparkles size={16} strokeWidth={1.5} color="#3FC6F0" /> "AI OPERATIONS BRIEF" (9px uppercase #3FC6F0)
  <ChevronRight size={16} color="#6B7588" /> right side (taps to /intelligence for full brief)
  Headline: {brief.headline} — 14px 700 #F4F6FA, marginTop 8px
  Actions: {brief.actions.map(a => <p>• {a}</p>)} — 11px #9AA4B8, lineHeight 1.6
  Loading: 2 Skeleton rows
  Error/empty: "AI is analysing your kitchen..." in #9AA4B8

Live Kitchen Metrics (Card, marginTop 12px):
  Title "LIVE KITCHEN METRICS" — 9px uppercase #9AA4B8
  4-col grid:
    Col 1: "Critical Dishes" / count from recipeStore / "-{countVsYesterday}" (static for now)
    Col 2: "Stale Prices" / count of ingredients > 7 days / "+{count} this week" (static)
    Col 3: "Active Alerts" / ai_insights count / colour-coded by count
    Col 4: "Margin" / aggregateMargin% / "+{delta}% vs LW" (static)
  Each metric tile (Card elevated, textAlign center):
    Value: 22px 800 #F4F6FA
    Label: 9px #9AA4B8
    Delta: 10px, green if positive / red if negative
```

Call `ai-ops-brief` Edge Function on mount. Cache in component state with 4-hour TTL check.

### Evaluation checklist
- [ ] `supabase/functions/ai-ops-brief/index.ts` exists and follows standard Edge Function pattern
- [ ] Edge Function CORS headers are set correctly
- [ ] Edge Function reads `ANTHROPIC_API_KEY` from `Deno.env.get()`
- [ ] Edge Function returns HTTP 200 with `{headline, actions, urgency}` on success
- [ ] Edge Function returns HTTP 200 with `{error: 'function_failed'}` on failure (never 500)
- [ ] `'ops_brief'` added to `InsightType` in `src/types/index.ts`
- [ ] AutopilotScreen: `/autopilot` route renders without crash
- [ ] AutopilotScreen: kitchen feed image loads from `/ai-images/autopilot-feed.png`
- [ ] AutopilotScreen: "● LIVE" badge renders in header with green tint
- [ ] AutopilotScreen: AI brief card shows Skeleton while loading
- [ ] AutopilotScreen: AI brief card shows headline + action bullets after load
- [ ] AutopilotScreen: AI brief card shows graceful empty state on Edge Function failure
- [ ] AutopilotScreen: 4 metric tiles show real data from stores (not hardcoded numbers)
- [ ] AutopilotScreen: "Critical Dishes" count matches recipeStore critical count
- [ ] AutopilotScreen: "Stale Prices" count matches ingredientStore stale count
- [ ] Base audit passes

---

## STEP R14 — IntelligenceHubScreen + MoreScreen (new)

**Goal:** Build IntelligenceHub (AI brief + cost trends + revenue sparkline) and More screen.

### IntelligenceHubScreen (`/intelligence`)

```
GlacierHeader:
  leftElement: <Logo />
  title "Intelligence Hub" (rendered as: "Intelligence " + <span color="#3FC6F0">Hub</span>)
  subtitle: "Good morning, {firstName}"

AI Morning Brief card (Card cyan-soft, marginTop 16px):
  Reuses `ai-dashboard-summary` Edge Function (same as Dashboard)
  Label: <Sparkles /> "AI MORNING BRIEF" (9px uppercase #3FC6F0)
  Headline: 2–4 word punchy h2 extracted from summary (first sentence)
  Body: full summary text (11px #9AA4B8)
  CTA button: "Fix this →" — primary cyan (small, width auto)
    Tap: navigate to /insights if reprice/remove insight, /ingredients if spike
  Loading: 2 Skeleton rows + 1 Skeleton button
  Failure: nothing rendered (silent)

Cost Trends card (Card, marginTop 12px):
  Title: "Cost Trends · last 6 weeks" (12px 700 #F4F6FA)
  Recharts BarChart:
    Data: average price across all ingredients for each of last 6 weeks
    Computed from `ingredient_price_history` — group by week, average price_per_kg
    Bars: older 4 bars rgba(63,198,240,0.3), last 2 bars #3FC6F0
    No axes labels — just bars with tooltip showing week + avg price index
    CartesianGrid: stroke rgba(255,255,255,0.06)
    Height: 100px
  If insufficient history (<2 records): show "Not enough data yet" in #6B7588

Est. Revenue card (Card, marginTop 12px):
  Label: "EST. REVENUE · THIS MONTH" (9px uppercase #9AA4B8)
  Large value: {formatCurrency(estimatedMonthlySales)} — 28px 800 #F4F6FA
  Row: <StatusBadge> or plain text "+0.0% vs LM" (static for now) right-aligned
  <Sparkline data={weeklyEstimates} color="#3FC6F0" height={46} />
  weeklyEstimates: 4 data points — estimated weekly sales (same formula as Dashboard × 7)
    All 4 points will be identical until historical tracking exists — that's fine

Alert grid (2×2, marginTop 12px):
  4 tiles (Card elevated each):
    "Margin Alerts" — count of critical recipes → tap to /recipes
    "Price Spikes"  — count of active spikes → tap to /alerts
    "AI Tips Ready" — count of active ai_insights → tap to /insights
    "Stale Prices"  — count of ingredients > 7 days → tap to /ingredients
  Each tile: metric value (24px 800, status colour), label (9px #9AA4B8), "Tap to review" (9px #6B7588)
```

### MoreScreen (`/more`)

```
GlacierHeader: title "More"

Tile list (each tile is a Card elevated, display flex, alignItems center, padding 16px, marginTop 8px):
  Icon (20px, color based on section) + label (14px 700 #F4F6FA) + ChevronRight (16px #6B7588)
  whileTap scale 0.97 spring

Section: (no label — grouped visually by spacing)
  Tile: <BarChart2 color="#3FC6F0"> "Intelligence Hub" → /intelligence
  Tile: <Package color="#3FC6F0"> "Inventory" → /ingredients
  Tile: <Bell color="#F0A93F"> "Alerts" → /alerts

Section: marginTop 16px
  Tile: <Settings color="#9AA4B8"> "Settings & Profile" → /settings

Section: marginTop 16px (plain rows, not tiles)
  Row: "KitchenIQ" + version (from import.meta.env.VITE_APP_VERSION or '2.0')
  Row: "Built for Indian restaurants"
  Row: "Beta — Free plan" badge (cyan-soft)
```

### Evaluation checklist
- [ ] `/intelligence` route renders IntelligenceHubScreen without crash
- [ ] IntelligenceHubScreen: AI brief card shows Skeleton then text
- [ ] IntelligenceHubScreen: AI brief card renders nothing on failure (no error shown)
- [ ] IntelligenceHubScreen: cost trends BarChart renders with dark bg + cyan bars
- [ ] IntelligenceHubScreen: "Not enough data" shows when price history is sparse
- [ ] IntelligenceHubScreen: estimated revenue shows formatted ₹ value
- [ ] IntelligenceHubScreen: Sparkline renders with 4 data points
- [ ] IntelligenceHubScreen: all 4 alert grid tiles show real counts from stores
- [ ] IntelligenceHubScreen: each alert grid tile taps to correct route
- [ ] `/more` route renders MoreScreen without crash
- [ ] MoreScreen: all 4 tiles navigate to correct routes
- [ ] MoreScreen: Intelligence Hub tile navigates to `/intelligence`
- [ ] MoreScreen: renders instantly (no data fetching)
- [ ] Base audit passes

---

## STEP R15 — Full Integration Pass

**Goal:** Verify the complete app is coherent, dark, functional, and production-ready.

### Systematic checks (run in order)

**1. TypeScript**
```bash
npx tsc --noEmit
```
Zero errors. Fix any that exist.

**2. Build**
```bash
npm run build
```
Must succeed. Fix any build errors.

**3. Icon audit**
```bash
grep -rn "lucide-react" src/ --include="*.tsx" -l
```
For every file returned, confirm every `<IconName` usage has `strokeWidth={1.5}`. Fix any missing.

```bash
grep -rn "strokeWidth" src/ --include="*.tsx" | grep -v "strokeWidth={1.5}"
```
Must return zero lines.

**4. Colour audit**
```bash
grep -rn "#[0-9A-Fa-f]\{6\}" src/ --include="*.tsx" | grep -v "rgba"
```
Investigate every hit. Allowed hex values in component files:
- `#0C111B`, `#161D2B`, `#1B2436` — surface colours
- `#3FC6F0`, `#04212E` — cyan and on-cyan
- `#F4F6FA`, `#9AA4B8`, `#6B7588` — text colours
- `#36D399`, `#F0A93F`, `#F0596B` — status colours

NOT allowed: `#FFFAF5`, `#7C3AED`, `#0D0A14` (old header), `#FFFFFF` (old card bg), `#F5F0FA` (old AI bg), `#5B21B6` (old AI text).

**5. Computed value audit**
```bash
grep -rn "margin_percent\|total_cost\|profit_per_dish" src/
```
Zero results.

**6. Anthropic audit**
```bash
grep -rn "anthropic\|ANTHROPIC\|claude-3\|claude-sonnet" src/ --include="*.ts" --include="*.tsx"
```
Zero results.

**7. DarkHeader audit**
```bash
grep -rn "DarkHeader" src/
```
Zero results. Confirm `DarkHeader.tsx` is deleted.

**8. Public assets audit**
```bash
ls public/ai-images/
```
Must contain: `login-kitchen-bg.png`, `autopilot-feed.png`.

**9. Stub audit** — confirm no stub screens remain
```bash
grep -rn "stub\|coming soon\|TODO" src/screens/ --include="*.tsx" -i
```
Zero results.

**10. Route coverage** — open browser at each route and confirm no crash:
`/`, `/login`, `/otp`, `/setup`, `/onboarding/import`, `/onboarding/parse`, `/onboarding/ingredients`, `/dashboard`, `/recipes`, `/recipes/new`, `/recipes/TEST_ID`, `/recipes/TEST_ID/edit`, `/recipes/TEST_ID/nutrition`, `/ingredients`, `/ingredients/TEST_ID`, `/insights`, `/alerts`, `/alerts/TEST_ID`, `/settings`, `/autopilot`, `/intelligence`, `/more`

**11. BottomNav active state** — navigate to `/dashboard`, `/recipes`, `/autopilot`, `/alerts`, `/more` in sequence and confirm the correct tab is highlighted at each route.

**12. Dark theme spot-check** — at 390px width in browser DevTools:
- Body background: dark radial gradient (not warm cream)
- All card backgrounds: `#161D2B` or `#1B2436`
- All primary buttons: `#3FC6F0`
- Zero warm cream (`#FFFAF5`) anywhere
- Zero purple (`#7C3AED`) anywhere
- AI tip cards: cyan-soft (not purple)

**13. Animation spot-check:**
- Page transition spring fires between routes (not instant cut)
- Dashboard Gauge arc animates on mount
- Dashboard stat tiles count up from 0 on mount
- Button and card tap animations (scale 0.96) fire on all interactive elements

**14. Commit**
```
git commit -m "step-R15: glacier redesign integration pass — all 22 screens, dark theme, 4 new screens"
```

### Final evaluation checklist
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — succeeds
- [ ] Icon audit — 0 icons without `strokeWidth={1.5}`
- [ ] Colour audit — 0 disallowed hex values in component files
- [ ] Computed value audit — 0 results
- [ ] Anthropic audit — 0 results
- [ ] DarkHeader audit — 0 results
- [ ] Both AI images exist in `public/ai-images/`
- [ ] No stub screens remain
- [ ] All 22 routes render without crash
- [ ] BottomNav highlights correct tab on all 5 primary routes
- [ ] No warm cream or purple visible in any screen at 390px width
- [ ] Page transitions animate (spring physics, not instant)
- [ ] Gauge animates on Dashboard mount
- [ ] Stat tiles count up on Dashboard mount
- [ ] All tap targets have scale animation

---

## COMMIT CONVENTION

```
step-R1:  design system — glacier tokens, dark CSS, route stubs
step-R2:  component library — 11 restyled, GlacierHeader, Gauge, Sparkline, DishPlaceholder, BottomNav
step-R3:  auth screens — Splash (hero image), OTP (dark)
step-R4:  onboarding screens — Setup, MenuImport, AiParser, IngredientPicker
step-R5:  dashboard — Gauge integration, estimated sales/COGS selector
step-R6:  dishes screen — Performance/Pricing tabs, DishPlaceholder
step-R7:  dish detail — margin trend sparkline, computeMarginTrend helper
step-R8:  recipe forms — AddRecipe (AI-first), EditRecipe
step-R9:  ingredient screens — InventoryManager (delta %), IngredientDetail (dark charts)
step-R10: recommendations screen — hero card + list layout
step-R11: alerts — AlertDetail redesign, AlertsListScreen new
step-R12: nutrition + settings — dietary chip tabs, settings profile card
step-R13: autopilot — ai-ops-brief Edge Function, AutopilotScreen
step-R14: intelligence hub + more screen — new screens
step-R15: integration pass — full audit, dark theme QA
```

---

*KitchenIQ Glacier Build Plan v2.0*
*15 steps · 22 screens · 4 new screens · 1 new Edge Function · 0 new DB tables*
*Self-evaluation after every step. Two-failure rule applies throughout.*
