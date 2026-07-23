# KitchenIQ — Glacier Design Specification
**Version 1.0 · Based on Glacier mockup set · July 2026**

---

## 1. What "Glacier" is

Glacier is a dark-native visual theme for KitchenIQ. The name comes from the cold cyan accent (`#3FC6F0`) on a deep navy base. It replaces the original saffron-glow/purple spec with a more contemporary AI-product aesthetic — think Perplexity, Linear, or Raycast — while keeping the same underlying information architecture and margin-intelligence product logic.

---

## 2. Design tokens (locked)

### Colour palette

| Token | Hex / Value | Usage |
|---|---|---|
| App background | `#0C111B` | Base layer behind all screens |
| Panel | `#161D2B` | Cards, input fields, nav |
| Panel elevated | `#1B2436` | Nested cards, highlighted rows |
| Border subtle | `rgba(255,255,255,0.08)` | Default card borders |
| Border strong | `rgba(255,255,255,0.14)` | Inputs, nav pill, focused |
| Text primary | `#F4F6FA` | Headings, values |
| Text secondary | `#9AA4B8` | Subtitles, body copy |
| Text faint | `#6B7588` | Labels, timestamps, icons |
| Cyan (brand) | `#3FC6F0` | Active nav, CTA buttons, AI tip accent, gauge arc, sparklines |
| Cyan deep | `#1E5C99` | Avatar gradient, logo base |
| Cyan soft | `rgba(63,198,240,0.14)` | AI tip card bg, active icon tint |
| Green (healthy) | `#36D399` | Healthy margins, progress fills, positive deltas |
| Green soft | `rgba(54,211,153,0.14)` | Healthy stat tile bg, healthy badge |
| Amber (watch) | `#F0A93F` | Watch margins, demand warnings |
| Amber soft | `rgba(240,169,63,0.14)` | Watch stat tile bg |
| Red (critical) | `#F0596B` | Critical margins, stockout alerts, negative deltas |
| Red soft | `rgba(240,89,107,0.14)` | Critical stat tile bg, alert card bg |
| Text on cyan | `#04212E` | Button text when bg is cyan |

### Typography

| Style | Size | Weight | Letter spacing |
|---|---|---|---|
| Page title | 21px | 800 | −0.4px |
| Section heading | 18px | 700 | −0.3px |
| Card heading | 13–14px | 700 | −0.2px |
| Body / description | 11px | 400 | 0 |
| Label / meta | 9–9.5px | 700 | +0.05em (uppercase) |
| Data value (large) | 28–34px | 800 | −0.5px |
| Font family | Inter | — | — |

### Spacing rhythm

Cards: `16px` padding. Inner card rows: `10–12px` vertical padding. Outer screen padding: `14px` horizontal, `14px` top. Bottom nav clearance: `96px` bottom padding on scroll area.

---

## 3. Core components

### 3.1 Cards

Two levels. All use `border-radius: 16px`.

**Panel card** — `background: #161D2B`, `border: 1px solid rgba(255,255,255,0.08)`
Used for standard content sections.

**Panel elevated card** — `background: #1B2436`, same border.
Used for featured content: AI brief, recommendation, alert body. Sits on top of a Panel card or directly on the bg.

### 3.2 Primary button

Pill shape, `border-radius: 999px`. `background: #3FC6F0`, `color: #04212E`, `font-weight: 700`, `font-size: 11.5px`, `padding: 11px 0`, full-width by default. Optional inline variant for `width: auto` with `padding: 9px 18px`.

No secondary buttons — ghost variant uses `background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.14)`, `color: #fff`.

### 3.3 Status pills

`border-radius: 999px`, `font-size: 9px`, `font-weight: 700`, `padding: 4px 9px`.

Cyan / Green / Amber / Red variants using the soft background + full-colour text pairs from the palette above.

### 3.4 Status stat tiles (Dashboard)

Three tiles in a 3-column grid. Each tile has a deep-tinted background matching its status colour (soft token), and the number + label use the full colour. `border-radius: 13px`.

| State | Bg | Text |
|---|---|---|
| Healthy | `rgba(54,211,153,0.10)` | `#36D399` |
| Watch | `rgba(240,169,63,0.10)` | `#F0A93F` |
| Critical | `rgba(240,89,107,0.10)` | `#F0596B` |

### 3.5 Circular margin gauge

SVG-based. Outer ring: `rgba(255,255,255,0.08)`, `stroke-width: 11`. Fill arc: `#3FC6F0`, `stroke-linecap: round`. Value animates from 0 on page load. Shows margin % in `font-size: 34px / weight: 800` centred inside. Delta (e.g. "+4.2% vs LW") shown below in `10px / cyan`.

### 3.6 Progress / margin bar

`height: 4px`, track `rgba(255,255,255,0.08)`, fill colour matches dish status (green/amber/red). `border-radius: 99px`.

### 3.7 AI Tip card

`background: rgba(63,198,240,0.14)`, `border: 1px solid rgba(63,198,240,0.3)`, `border-radius: 13px`. Left-docked sparkle icon in cyan. Body text `#CDEEFC`, bold highlights in `#fff`. Always dish-specific with real ₹ numbers.

### 3.8 Bottom navigation

Pill container: `background: rgba(20,26,38,0.9)`, `backdrop-filter: blur(6px)`, `border: 1px solid rgba(255,255,255,0.14)`, `border-radius: 999px`. Positioned `14px` from bottom-left and right. Active icon: `#3FC6F0`. Inactive: `#6B7588`. Icons: Tabler Icons, `font-size: 16px`. Label below icon at `7.5px / weight: 600`.

### 3.9 Inputs

`background: #1B2436`, `border: 1px solid rgba(255,255,255,0.14)`, `border-radius: 11px`, `padding: 11px 13px`. Field label floated above in `9px uppercase #6B7588`.

---

## 4. AI imagery — how and where to use it

The Operations Autopilot screen uses a **full-bleed AI-generated image** inside a card to represent the live kitchen feed. This is the primary example, but the pattern should extend to any screen where a visual "feed" or atmospheric context adds meaning.

### The role of AI images in Glacier
They are not decoration. They simulate a live, sensor-aware product — a restaurant that KitchenIQ is "watching." They make the AI-native claim visual rather than just textual.

### Where AI images appear (full screen inventory)

| Screen | Image type | Prompt direction |
|---|---|---|
| Operations Autopilot | Kitchen feed / overhead drone shot of a live Indian restaurant kitchen at dinner rush, warm red/amber service lighting, steam, motion blur | `Top-down, photorealistic, cinematic, dark moody warm tones` |
| Splash | Atmospheric background (optional) | Abstract dark fluid with cyan bioluminescent gradient, no text |
| Intelligence Hub | Thumbnail in AI morning brief card | Overhead aerial of spice jars / a mandi market, teal grade |
| Dashboard | Subtle hero illustration (optional) | Abstract neural net / data mesh with warm saffron nodes on dark navy |
| Ingredient detail | Ingredient close-up | Photorealistic studio shot of the specific ingredient (e.g. tomatoes) with dark backdrop |

### Aspect ratios and sizing

| Use | Aspect ratio | Width | Notes |
|---|---|---|---|
| Full card image (Autopilot) | 16:9 | 100% of card | `border-radius: 14px`, overlay gradient bottom |
| Brief thumbnail | 4:3 | 80px | Rounded `border-radius: 10px`, right-aligned |
| Background (Splash) | Full screen | 280px | `position: absolute`, 30% opacity, no pointer events |

### Overlay treatment
All full-card images use a bottom gradient overlay: `linear-gradient(to top, rgba(12,17,27,0.9) 0%, transparent 60%)`. This keeps the image atmospheric without competing with data. A small pill label (e.g. `Kitchen feed · live`) sits bottom-left on the image in `9px / font-weight: 700 / color: #3FC6F0` with a dark semi-transparent background.

### Image source options
During development use placeholder services (picsum.photos, unsplash source API). For production: generate with Stable Diffusion XL, Midjourney, or DALL-E 3 using the prompts above. Store as `webp` at `560×400px` @2x for standard card size. Lazy-load; show the panel skeleton while loading.

---

## 5. Screen-by-screen specification

### Screen 1 — Splash / Login

**Route:** `/`

**Layout:** Centred, vertically centred in full screen height. No nav.

**Elements:**
- App icon: `64px × 64px`, `border-radius: 18px`, cyan gradient, flame icon centred
- App name: `22px / weight: 800`
- Tagline: `11px / #9AA4B8`
- Email input field
- Primary CTA: "Send code →"
- Legal copy: `9.5px / #6B7588` — "Free for 3 months · No credit card"

**AI image (optional):** Abstract dark fluid background at 30% opacity behind the full screen.

---

### Screen 2 — Dashboard

**Route:** `/dashboard`

**Header elements:**
- Brand logo + restaurant name pill on left
- User avatar initial on right (gradient purple circle)
- Restaurant name + city below (`11px / secondary`)
- Alert headline: "X dishes need attention" (`17px / weight: 700`)

**Stat row:** 3-column grid of healthy / watch / critical tiles.

**Alert strip:** Red-tinted card with alert icon, alert headline, and "Tap for AI fix" sub-label. Appears only when ingredient spike ≥ 15%.

**Dish list:** Each dish card contains — dish name + category + price (left), status pill (right), 4px progress bar, margin % + profit/plate below. Sorted worst-first.

---

### Screen 3 — Recipe Detail

**Route:** `/recipes/:id`

**Header:** Back arrow + "Recipes" breadcrumb. Dish name as page title. Category + serves as subtitle.

**Hero margin:** Large margin % number (`34px / weight: 800`, colour matches status) + status pill inline. Progress bar below. "Sells ₹X · Costs ₹Y" in `10px / faint`.

**AI Tip card:** Appears directly below hero when margin is critical. Cyan-tinted, specific substitution with ₹ savings.

**Cost breakdown card:** Table rows — Raw ingredients / Wastage (%) / Overhead (%) / **Total / portion** (bold, full colour text, no border below).

---

### Screen 4 — Add Recipe

**Route:** `/recipes/new`

**Header:** Back + "Add recipe" title + "Type naturally — AI will parse it" subtitle.

**AI Recipe Parser card:** Cyan-tinted card. Shows example input in italic (`"Dal Makhani — 200g urad dal…"`). Primary CTA "Parse with AI →".

**Manual fallback:** Label "Or fill manually" + three inputs: Dish name, Category, Selling ₹ (last two side by side).

---

### Screen 5 — Ingredients

**Route:** `/ingredients`

**Header:** Page title + subtitle "Update prices weekly." + Cyan `+` FAB icon on right.

**Ingredient rows:** Each row — name (bold) + category/unit (meta), price on right + delta % below price. Row with spike highlighted with amber-tinted background and amber border. Chevron-down at bottom signals more items.

**Price spike highlight:** Amber `rgba(240,169,63,0.06)` bg + `rgba(240,169,63,0.3)` border. Delta in amber with up arrow icon.

---

### Screen 6 — Nutrition Label

**Route:** `/recipes/:id/nutrition`

**Header:** Back + parent dish name + "Nutrition Label" title. FSSAI compliance note as subtitle.

**Dietary tags:** Pills row (Non-veg / Vegan / Jain / Gluten-free / High protein as applicable).

**Nutrition table card:** FSSAI-format table. Columns: Nutrient / Per 100g / Per serve. Rows: Energy, Protein, Total fat, Carbohydrate (and sugars, saturated fat sub-rows in final version).

**CTA:** "Download PDF" full-width cyan button.

---

### Screen 7 — Menu Optimizer

**Route:** `/insights` (or `/optimize`)

**Header:** Page title + restaurant subtitle.

**AI Recommendation card (top):** Elevated card with sparkle icon, recommendation headline, specific dish + ₹ delta, CTA "Apply change".

**Category sections:** Each of the 4 menu-engineering quadrants (Stars / Plowhorses / Puzzles / Dogs) shown as a labelled section with icon, sub-description, and dish rows. Dish rows use elevated panel background, dish name left, margin % right colour-coded.

**Simulate changes card:** Slider for global price adjustment (−5% to +15%). "Forecast profit impact" CTA. Two outcome tiles: Profit upside (cyan) + Demand impact (red).

**Dish-level performance:** List of individual dishes as tappable rows.

---

### Screen 8 — Operations Autopilot

**Route:** (standalone or bottom-nav tab)

**Header:** Restaurant name tag above brand row. Page title "Operations Autopilot" with subtitle as a live-dot row ("AI-optimizing for the dinner rush").

**Live floor card:** Real-time insight label + high-demand pill. 2×2 stat grid: Active tables / Wait time / AI-predicted / Turn rate.

**AI camera feed image:** Full-bleed AI-generated kitchen image inside a card. `height: 130px`, gradient overlay, "Kitchen feed · live" label. Prompt: overhead cinematic shot of a busy Indian restaurant kitchen, amber service light, steam, dark tones.

**Inventory alert card:** Red-tinted. Alert icon + "Critical" pill. Ingredient name + quantity. Progress bar (low fill = low stock). AI prediction copy. "Auto-order now" CTA.

**Staffing optimizer card:** Front of house + Kitchen crew rows. Each has role name, current/capacity number, 4px progress bar, status pill.

**Kitchen efficiency tiles:** 2-col grid — Prep accuracy + Menu efficiency.

**Ask KitchenIQ AI bar:** Elevated card with pre-filled query, orange send FAB.

---

### Screen 9 — Intelligence Hub

**Route:** `/intelligence`

**Header:** Brand row. Page title "Intelligence Hub" with cyan accent on last word. Subtitle: "Welcome back, [restaurant name]."

**AI Morning Brief card:** Elevated. Label row with sparkle icon + "AI morning brief" in cyan. Bold headline. Body copy with specific dish + ₹ figure. Inline "Fix leakage →" button (not full width).

**Cost trends bar chart:** 6-bar column chart, latest 2 bars in cyan, rest in `rgba(63,198,240,0.18)`. Label row below.

**Live pulse card:** Revenue vs forecast number (`₹X,XX,XXX`), cyan sparkline, time axis, delta pill.

**Quick-action quad grid:** 2×2 tiles — Profit alerts / Menu hits / Staff tasks / Inventory low. Each with colour-coded icon, title, sub-label.

**Kitchen operations card:** Delivery platform status row with progress bar.

---

## 6. Motion (to be implemented in code)

| Interaction | Spec |
|---|---|
| Page transition | Spring in from right. `stiffness: 380, damping: 30, mass: 0.8`. Exit scales to `0.94` + fades. |
| Card tap | `scale: 0.97, opacity: 0.85`. Spring `stiffness: 500, damping: 30`. |
| Gauge fill | Arc draws from 0 to value over `800ms` on mount. |
| Number count-up | Margin % and ₹ values count from 0 to final over `600ms`. |
| Skeleton loaders | Shimmer `linear-gradient` from `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.10)`. Never plain "Loading…". |
| AI image fade-in | `opacity: 0 → 1` over `300ms` after image load resolves. |
| Bottom sheet (ingredient picker) | Slides up from bottom with drag handle. Dark overlay `rgba(0,0,0,0.5)`. |

---

## 7. What changes from the original spec

| Original spec (purple/saffron) | Glacier |
|---|---|
| Header bg `#0D0A14` with saffron radial glow | Full dark bg `#0C111B`, no glow — flat depth from panel elevation |
| Action colour `#7C3AED` (purple) | Action colour `#3FC6F0` (cyan) |
| Logo: purple square with KIQ mark | Logo: cyan gradient pill with flame icon |
| Spice particle dot animation | Removed — replaced by AI image cards for atmosphere |
| Stat blocks: deep tinted bg + glowing number | Kept — same pattern, colours updated to Glacier tokens |
| AI tip: `#F5F0FA` bg, `#5B21B6` text | AI tip: `rgba(63,198,240,0.14)` bg, `#CDEEFC` text |
| Bottom nav: white bg, purple active | Bottom nav: frosted dark pill, cyan active |
| No AI imagery | AI-generated images used on Autopilot + optionally Splash, Hub, Ingredient detail |

---

*This spec governs all Glacier-theme implementation. For any value not listed here, default to the closest panel colour and the cyan accent. The information architecture (routes, data models, margin formula, Supabase schema) from KitchenIQ Spec v3.0 remains unchanged.*
