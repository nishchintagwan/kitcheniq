# KitchenIQ — Product Spec
### Version 3.0 — Complete (Agent-ready)
### Last updated: June 2026

---

## 1. WHAT IS KITCHENIQ

KitchenIQ is an AI-native operating system for independent Indian restaurants. It uses AI to run three core jobs simultaneously: margin intelligence, menu optimisation, and operations autopilot — all from a single mobile-first app.

AI is not a feature in KitchenIQ. It is the product. Every screen, every insight, and every action is AI-powered. The owner does not calculate, analyse, or decide — they receive clear answers and act on them.

### The three AI jobs

**Job 1 — Margin Intelligence**
AI tells the owner which dishes are killing their margins, exactly why, and what to do about it. Not a report. A specific answer with a specific action.

**Job 2 — Menu Optimisation**
AI tells the owner what to price, what to promote, and what to remove — based on actual cost data, not gut feel.

**Job 3 — Operations Autopilot**
AI handles ingredient tracking, price spike alerts, and supplier decisions silently in the background. It surfaces only when something needs the owner's attention.

### How AI shows up in the product
- **Dashboard-first:** AI surfaces insights automatically. Owner opens the app and sees what needs attention — no searching, no menus to navigate.
- **Alert-driven:** AI is silent when everything is fine. It speaks up only when action is needed — a margin has dropped, a price has spiked, a dish needs repricing.
- The owner never asks AI a question. AI tells them what they need to know before they think to ask.

### The positioning line
**"Your restaurant's AI brain. It never sleeps, never misses a price change, and always knows which dish is hurting you."**

---

## 2. THE CUSTOMER

### Who they are
- Owner of a single family-run restaurant in an Indian metro city
- Age 35–60, not technical, uses WhatsApp daily
- Has a physical menu with 20–80 dishes, often laminated and years old
- Buys ingredients from a local mandi or supplier weekly — prices change constantly
- Monthly revenue: ₹5L–₹30L
- Has never used software to track food costs
- Prices dishes by gut feel, by copying competitors, or by what "feels right"

### What they believe (that is costing them money)
- "My popular dishes are my most profitable"
- "If I'm busy, I'm making money"
- "I know roughly what things cost"
- "I'll update prices when things get really bad"
- "Software is for big chains, not for us"

### What they actually experience
- Tomato prices spike from ₹30 to ₹120/kg — their menu price stays the same for months
- Their bestselling dish (Dal Makhani) has a 19% margin because cream, butter, and cashew prices all rose simultaneously
- 3 dishes on their menu are actively losing money — they just don't know which ones
- They cut staff or reduce portions instead of repricing the right dishes
- A competitor raises prices and loses customers — so they don't either, even when they should

### What they actually need
Not a dashboard. Not a report. One answer, delivered automatically, every morning:

**"Here is what is hurting your restaurant right now. Here is what to do about it."**

---

## 3. THE PROBLEM WE SOLVE

### Primary problem
Independent restaurant owners are running their business blind. They have no real-time visibility into which dishes are profitable, which are loss-makers, and how mandi price changes are silently eroding their margins every week.

### Why existing solutions fail
- **Petpooja / UrbanPiper:** POS and order management only. No cost intelligence, no margin awareness.
- **Excel sheets:** Static. Don't update when prices change. Require accounting knowledge.
- **Accountant:** Monthly or quarterly. Too slow. Tells you what happened, not what to do now.
- **Gut feel:** Works when prices are stable. India's mandi prices are never stable.

### The gap KitchenIQ fills
Real-time, AI-powered margin intelligence + menu optimisation + operations alerts — designed specifically for non-technical Indian restaurant owners who have never used software before.

---

## 4. THE SOLUTION

KitchenIQ replaces gut feel with AI-generated certainty. The owner sets up their restaurant once. After that, KitchenIQ runs continuously in the background — monitoring prices, recalculating margins, detecting problems, and surfacing exactly what the owner needs to act on.

### What makes it AI-native (not just AI-assisted)
- **Setup is AI-powered:** Owner photographs their physical menu. AI reads it, extracts every dish, and imports the full menu automatically. Zero manual data entry for menu setup.
- **Insights are AI-generated:** The owner never reads raw numbers. AI translates numbers into plain-English actions.
- **Alerts are AI-triggered:** The system monitors ingredient prices continuously. When something changes enough to matter, AI fires an alert with a specific recommendation.
- **Operations run on autopilot:** Ingredient consumption, price history, and margin trends are tracked automatically.

### The core loop
1. **Setup (once, 10 minutes):** Owner photographs their menu → AI imports all dishes → Owner confirms prices → KitchenIQ calculates every margin instantly
2. **Daily (30 seconds):** Owner opens app → sees AI dashboard → acts on alerts if any → closes app
3. **Weekly (2 minutes):** Owner updates ingredient prices → AI recalculates everything → flags affected dishes → suggests specific actions
4. **Monthly:** AI generates a menu performance summary — what to keep, what to reprice, what to remove

---

## 5. ONBOARDING EXPERIENCE

This is the most critical part of the product. A non-technical restaurant owner must go from zero to their first AI insight in under 5 minutes — without typing a single dish manually.

### The data entry problem — solved
Manual ingredient entry + form-based recipe builder requires 1–2 hours of data entry before the owner sees any value. This is the primary reason restaurant SaaS products fail at onboarding.

**KitchenIQ solves this with menu photo import:**
Owner photographs their physical menu. Claude Vision reads the menu, extracts every dish name, category, and price. The owner's entire menu is imported in under 60 seconds.

### Target: first 5 minutes

**Minute 0–1: Sign up**
- Enter email (test phase) / phone OTP (production) → verified
- No password. No credit card. No friction.

**Minute 1–2: Restaurant setup**
- Name, city, cuisine type (3 fields only)
- FSSAI number optional — can skip
- One tap: done

**Minute 2–4: Menu photo import**
- Prompt: "Take a photo of your menu or upload it"
- Claude Vision reads the menu image, extracts dish names, categories, selling prices
- Owner sees a preview: "We found 34 dishes. Does this look right?"
- Owner taps to remove incorrect items, adds missed ones
- AI estimates ingredient costs per dish based on dish name + cuisine type + city
- Owner adjusts where obviously wrong

**Minute 4–5: First AI insight**
- KitchenIQ calculates margin for every imported dish instantly
- Dashboard appears with all dishes colour-coded: healthy / watch / critical
- AI immediately surfaces the most urgent finding
- Owner is hooked before they've done any real work

### Fallback onboarding (if photo import fails)
- AI text parser: owner types dish name in plain English → AI estimates costs → owner adjusts
- Manual form: traditional ingredient-by-ingredient entry

### Onboarding rules
- Never show an empty screen — always show progress or pre-populated data
- Maximum 3 fields per screen
- Every screen has one primary action only
- Skip options everywhere — owner can always refine later
- AI estimates always shown as estimates — never presented as exact until owner confirms
- Photo import must work on a standard Android camera photo

---

## 6. CORE FEATURES — MVP

### 6.1 Menu Photo Import (AI)

**What it does:**
Owner photographs their physical menu. Claude Vision reads it and imports all dishes automatically.

**Input:** JPEG or PNG photo from phone camera, or PDF upload
**Output:** Structured list of dishes with names, categories, and prices

**Claude prompt structure:**
- Image passed to Claude with vision capability
- System prompt instructs Claude to extract: dish name, category, selling price, dietary indicators
- Response returned as structured JSON
- Confidence score per dish — low confidence items flagged for owner review

**Accuracy target:** 85%+ of dish names correctly extracted from a standard printed Indian restaurant menu

**Fallback:** If confidence < 70% on a dish, it is flagged with "Please review"

**Rules:**
- Maximum 5 menu photos per import session
- Maximum 100 dishes per import
- Owner can always add, edit, or remove dishes after import

---

### 6.2 AI Recipe & Cost Engine

**Ingredient library:**
80 common Indian restaurant ingredients pre-loaded with typical metro prices. Owner selects the ones they use. Prices are editable.

Includes: Tomato, Onion, Potato, Garlic, Ginger, Green chilli, Coriander, Capsicum, Spinach, Peas, Cauliflower, Carrot, Paneer, Butter, Ghee, Fresh cream, Curd, Milk, Chicken, Mutton, Eggs, Refined oil, Mustard oil, Basmati rice, Urad dal, Chana dal, Toor dal, Maida, Atta, Besan, Cumin, Coriander powder, Turmeric, Red chilli powder, Garam masala, Kasuri methi, Cashew, Almond, Sugar, Salt, Tomato puree (tin)

**Units supported:** kg, gram, litre, ml, piece, dozen

**AI recipe parser (text):**
Owner types in plain English → Claude extracts structured recipe data

**The margin formula:**
```
raw_cost        = SUM(ingredient_quantity × price_per_unit) ÷ serves
wastage_cost    = raw_cost × (wastage_percent ÷ 100)
overhead_cost   = raw_cost × (overhead_percent ÷ 100)
total_cost      = raw_cost + wastage_cost + overhead_cost
margin_percent  = ((selling_price − total_cost) ÷ selling_price) × 100
profit_per_dish = selling_price − total_cost
```

**Margin status:**
| Status | Margin % | Colour |
|---|---|---|
| Healthy | ≥ 50% | #00DC82 emerald green |
| Watch | 30–49% | #FBB924 amber |
| Critical | < 30% | #FF505F bright red |

**Display rules:**
- Always show margin % to 1 decimal place
- Always show ₹ profit per dish alongside %
- Always show total cost per portion
- Numbers animate on page load (count up from 0)
- Margin bar: 3px height, fills proportionally

---

### 6.3 AI Dashboard — Margin Intelligence

**AI summary (top of dashboard):**
Every time owner opens the app, AI generates a 1–2 sentence plain-English summary:
> "2 dishes crossed into critical margin today after tomato prices rose. Your Shahi Paneer and Matar Paneer need attention."

**Health summary — tinted stat blocks (Ultrahuman-style):**
Three stat blocks where the card background takes a deep tinted version of the metric colour and the number glows in a brighter version of the same colour:
- Healthy card: `background #003D20` · number `#00DC82`
- Watch card: `background #3D2000` · number `#FBB924`
- Critical card: `background #3D0008` · number `#FF505F`
Each card has a 0.5px border in the respective colour at 40% opacity.

**Alert strip:**
Appears when any ingredient changed ≥ 15% since last update. Tappable to see affected dishes and AI recommendations.

**Dish list:**
Sorted worst-first by default. Each card shows: dish name, category, selling price, margin % with colour-coded bar, status badge, cost per portion.

**Rules:**
- Dashboard loads under 2 seconds on 4G
- AI summary generates in background — show cached version until new one ready
- Pull to refresh updates all margins with latest prices

---

### 6.4 AI Price Spike Alert & Operations Autopilot

**Trigger:** Any ingredient price change ≥ 15% from previous recorded price.

**What AI does automatically:**
1. Identifies all recipes using that ingredient
2. Recalculates new margin for each affected recipe
3. Detects status changes (Watch → Critical etc.)
4. Generates a specific recommendation per affected dish
5. Surfaces alert on dashboard

**Alert format:**
```
Tomato price up 45% (₹40 → ₹58/kg)
4 dishes affected — 2 now critical

• Shahi Paneer: 51% → 31%
  AI says: Raise price to ₹320 or reduce tomato by 30g

• Matar Paneer: 44% → 24%
  AI says: Switch to tomato puree — saves ₹18/portion
```

**Rules:**
- Alert persists until owner dismisses it
- Multiple simultaneous spikes grouped into one alert
- Price decrease shows green positive alert

---

### 6.5 AI Menu Optimisation

**Three AI outputs:**

**Reprice:** When dish stays critical > 7 days:
> "Raise Dal Makhani from ₹220 to ₹260. At current costs margin is 19%. At ₹260 it becomes 38%."

**Promote:** Weekly, based on margin ranking:
> "Push Chicken Tikka more. It has your highest margin (74%) but is 8th on your Zomato menu."

**Remove:** When dish is critical > 30 days:
> "Veg Kolhapuri costs ₹198 to make and sells for ₹220. Every plate loses you ₹22."

---

### 6.6 AI Tip Card

**When it fires:**
- Dish margin drops into critical (< 30%)
- Owner opens recipe detail with critical margin
- Price spike affects a dish significantly

**Rules:**
- Tip cached 24 hours
- If API fails: show nothing, no error visible
- Never generic — always dish-specific with real numbers
- Shown as purple card (`#F5F0FA` bg, `#5B21B6` text, `#7C3AED` icon) on recipe detail

---

### 6.7 FSSAI Nutrition Label Generator (AI-assisted)

**Nutrients calculated:**
Energy (kcal), Protein (g), Total carbohydrate (g) — of which sugars (g), Total fat (g) — of which saturated fat (g), Dietary fibre (g), Sodium (mg)

**Data source:** Pre-loaded IFCT 2017 table. For unknown ingredients: Claude API estimates, flagged as "AI estimate."

**FSSAI format:** Follows FSSAI Food Safety and Standards (Labelling and Display) Regulations 2020 exactly.

**Dietary auto-tags (AI-detected):**
- Jain: flags if onion, garlic, potato, carrot, beetroot detected
- Vegan: flags if dairy or meat detected
- Gluten-free: flags if maida, wheat, atta, barley detected
- High protein: protein > 25g per serving

**Export:** PDF download / PNG image / WhatsApp share

**Rules:**
- Requires minimum 3 ingredients
- PDF filename: `[DishName]_NutritionLabel_KitchenIQ.pdf`
- Watermark on free plan, removed on paid

---

### 6.8 Settings

**Restaurant profile:** Name, city, cuisine type, FSSAI number

**Plan & billing:**
- Free period: shows days remaining
- After 3 months: Razorpay subscription ₹499/month
- During test phase: "Beta — Free" badge

**Data export:** All recipes as CSV, all ingredients as CSV

---

## 7. WHAT IS NOT IN MVP

Do not build, suggest, or reference these:

- Inventory management (Module 3)
- Swiggy / Zomato integration
- WhatsApp CRM
- Multi-outlet support
- Agmarknet automatic price sync
- Staff portal or QR scanning
- Supplier management
- Festival planner
- Review aggregation
- Native iOS / Android app
- Hindi UI
- Team / employee accounts
- Voice input onboarding
- WhatsApp-based onboarding

---

## 8. TECHNICAL SPEC (OPEN)

Stack decisions fixed for test phase. Backend and hosting open for production.

### Frontend (fixed)
- React 18 + TypeScript
- Tailwind CSS v3
- React Router v6
- Zustand (state)
- React Hook Form + Zod (forms)
- TanStack Query (data fetching)
- Framer Motion (animations and transitions)
- Lucide React icons (strokeWidth 1.5 everywhere)
- Recharts (price history sparklines)

### Backend (test phase — open for production)
- Database: Supabase (Postgres)
- Auth: Supabase Auth — email OTP for test, phone OTP for production
- Edge Functions: Supabase (Claude API calls only — never from browser)
- AI model: claude-sonnet-4-6

### Performance targets
- First Contentful Paint: < 1.5s on 4G
- Time to Interactive: < 3s on 4G
- Dashboard load: < 2s
- AI tip response: < 3s
- Menu photo import: < 10s end to end

### Browser support
- Primary: Chrome on Android
- Secondary: Safari on iOS

---

## 9. DATABASE SCHEMA

### Tables
- `restaurants` — one per owner
- `ingredients` — master list per restaurant
- `recipes` — dishes per restaurant
- `recipe_ingredients` — join table (recipe ↔ ingredient + quantity)
- `ingredient_price_history` — every price change logged
- `nutrition_data` — cached nutrition per recipe
- `ingredient_nutrition` — IFCT 2017 lookup (read-only, shared)
- `menu_imports` — photo import sessions with raw Claude output
- `ai_tips` — cached AI tips per recipe (expires 24h)
- `ai_insights` — cached menu optimisation recommendations

### Row Level Security
All tables except `ingredient_nutrition` have RLS. Users only see their own restaurant's data.

### Computed values (never stored)
- `margin_percent` — live from current prices
- `total_cost_per_portion` — live
- `profit_per_dish` — live

---

## 10. DESIGN SYSTEM

### UI & Motion Philosophy
Three non-negotiable principles that govern every design decision:

1. **The UI is light** — warm cream background `#FFFAF5`, white cards, dark text. Not dark mode. The body of every screen is always light.

2. **The header is dark** — every screen has a dark header `#0D0A14` with a medium saffron atmospheric glow and floating spice particle dots. The dark header makes margin numbers, status colours, and tinted stat blocks pop with maximum visual impact. This is where the brand lives.

3. **Motion is Ultrahuman-level** — Ultrahuman is the reference for all transitions and interactions. Specifically:
   - Page transitions: incoming page springs in from right (stiffness 380, damping 30, mass 0.8). Outgoing page simultaneously scales down to 0.94 and fades. Back navigation reverses this.
   - Tap micro-interactions: all cards and buttons scale to 0.96 + opacity 0.85 on tap with spring stiffness 500, damping 30.
   - Content arrival: main content fades in 150ms after page lands (`opacity 0 → 1`, duration 200ms).
   - Margin numbers: count up from 0 to final value over 800ms using Framer Motion spring on page load.
   - Loading skeletons: grey shimmer placeholders in card shapes — never plain "Loading…" text.
   - Bottom sheet: ingredient picker slides up from bottom with drag handle and dark overlay.

### Colour palette (locked — do not deviate)

| Token | Hex | Usage |
|---|---|---|
| Header bg | #0D0A14 | Dark header on every screen |
| App background | #FFFAF5 | Warm cream — main body |
| Card bg | #FFFFFF | All cards and surfaces |
| Border | #EDE8F5 | All card borders (0.5px) |
| Text primary (light) | #1A1A1A | Body text on light bg |
| Text primary (dark) | #FFFFFF | Text on dark header |
| Text secondary | #888888 | Labels, meta, subtitles |
| Text muted (dark) | rgba(255,255,255,0.36) | Subtitles on dark header |
| Action / primary | #7C3AED | Buttons, active nav, logo, AI card, links |
| Action shadow | rgba(124,58,237,0.3) | Box shadow on purple buttons |
| Healthy number | #00DC82 | Glowing green number in stat block |
| Healthy card bg | #003D20 | Deep green tinted stat card background |
| Healthy card border | rgba(0,220,130,0.4) | Stat card border |
| Healthy badge bg | #F0FBF5 | Badge on light surface |
| Healthy badge text | #00A36C | |
| Watch number | #FBB924 | Glowing amber number in stat block |
| Watch card bg | #3D2000 | Deep amber tinted stat card background |
| Watch card border | rgba(251,185,36,0.4) | |
| Watch badge bg | #FFF8EC | |
| Watch badge text | #F59E0B | |
| Critical number | #FF505F | Glowing red number in stat block |
| Critical card bg | #3D0008 | Deep red tinted stat card background |
| Critical card border | rgba(255,80,95,0.4) | |
| Critical badge bg | #FFF5F6 | |
| Critical badge text | #FF505F | |
| AI tip bg | #F5F0FA | Purple tint background for AI tip card |
| AI tip text | #5B21B6 | |
| AI tip icon | #7C3AED | |
| Saffron glow | rgba(232,99,10,0.28) | Primary atmospheric glow top-right of header |
| Saffron glow secondary | rgba(245,166,35,0.14) | Secondary halo inside glow |
| Purple glow | rgba(124,58,237,0.10) | Counter-glow bottom-left of header |
| Spice dot 1 | #F5A623 | Floating particle dot colour A |
| Spice dot 2 | #E8630A | Floating particle dot colour B |
| Inactive nav | #BBBBBB | Inactive bottom nav icons and labels |

### Atmospheric header (applied to EVERY screen's dark header)
```
Primary glow: position absolute, top -50px, right -40px,
  width 220px, height 220px, border-radius 50%,
  background radial-gradient(circle, rgba(232,99,10,0.28) 0%,
    rgba(232,99,10,0.10) 40%, transparent 70%),
  animation: breathe 4s ease-in-out infinite

Secondary halo: position absolute, top -20px, right -10px,
  width 120px, height 120px, border-radius 50%,
  background radial-gradient(circle, rgba(245,166,35,0.14) 0%, transparent 65%)

Purple counter-glow: position absolute, bottom -20px, left -10px,
  width 100px, height 100px, border-radius 50%,
  background radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)

Spice dot 1: position absolute, top 10px, right 26px,
  width 2.5px, height 2.5px, border-radius 50%,
  background #F5A623, opacity 0.9,
  animation: drift1 4s ease-in-out infinite

Spice dot 2: position absolute, top 22px, right 13px,
  width 2px, height 2px, border-radius 50%,
  background #E8630A, opacity 0.7,
  animation: drift2 5s ease-in-out infinite

Spice dot 3: position absolute, top 7px, right 50px,
  width 2px, height 2px, border-radius 50%,
  background #F5A623, opacity 0.55,
  animation: drift3 6s ease-in-out infinite

Spice dot 4: position absolute, bottom 12px, right 36px,
  width 2px, height 2px, border-radius 50%,
  background #F5A623, opacity 0.4,
  animation: drift1 7s ease-in-out infinite

CSS animations:
  breathe: 0%,100% opacity 0.85 → 50% opacity 1
  drift1: 0%,100% translate(0,0) → 50% translate(5px,-7px)
  drift2: 0%,100% translate(0,0) → 50% translate(-4px,5px)
  drift3: 0%,100% translate(0,0) → 50% translate(7px,4px)
```

### Typography
- Font: Inter (weights 400 and 600 only)
- Sizes: 9px / 10px / 11px / 12px / 13px / 15px / 18px / 20px / 30px+
- Letter spacing: −0.3px to −0.5px on headings 18px+

### Component rules
- Cards: bg white, 0.5px border #EDE8F5, border-radius 14px
- Buttons: bg #7C3AED, text white, font-weight 700, border-radius 10px, box-shadow 0 4px 16px rgba(124,58,237,0.3)
- Inputs: bg #FFFAF5, 0.5px border #EDE8F5, focus border #7C3AED
- Margin bars: height 3px, empty track #F5F0FA
- Icons: Lucide React, strokeWidth 1.5 everywhere
- Bottom nav: bg white, border-top 0.5px #EDE8F5, active colour #7C3AED, inactive #BBBBBB

---

## 11. SCREEN INVENTORY

All screens are to be built from scratch. Nothing is pre-existing.

| Screen | Route |
|---|---|
| Loading screen | / (initial auth check) |
| Splash / login | / |
| OTP verification | /otp |
| Restaurant setup | /setup |
| Onboarding — menu photo import | /onboarding/import |
| Onboarding — AI text parser | /onboarding/parse |
| Onboarding — ingredient picker | /onboarding/ingredients |
| Dashboard | /dashboard |
| Recipe list | /recipes |
| Recipe detail | /recipes/:id |
| Add recipe | /recipes/new |
| Edit recipe | /recipes/:id/edit |
| Ingredient manager | /ingredients |
| Ingredient detail + history | /ingredients/:id |
| Nutrition label | /recipes/:id/nutrition |
| AI insights screen | /insights |
| Price spike detail | /alerts/:id |
| Settings | /settings |

---

## 12. USER FLOWS

### New user — photo import flow (primary)
```
Splash → OTP → Restaurant setup →
Menu photo import → AI extracts dishes →
Owner reviews + confirms →
AI estimates costs → Owner adjusts prices →
Dashboard with all margins → First AI insight fires
```

### New user — manual flow (fallback)
```
Splash → OTP → Restaurant setup →
Ingredient picker (pre-loaded library) →
AI text parser ("type your first dish") →
Dashboard with first margin → First AI insight fires
```

### Returning user (daily)
```
Splash (auto-login if session active) → Dashboard →
Read AI summary → Act on alerts if any → Close
```

### Price update flow
```
Ingredient manager → Edit price → Confirm →
Price history logged → All affected recipes recalculated →
If spike ≥ 15%: Alert fires on dashboard →
AI generates recommendations per affected dish
```

---

## 13. PRICING & BUSINESS MODEL

### Test phase (now)
- Free — no credit card, no limit, full access
- Badge: "Beta — Free"

### Launch pricing (Month 3)
- Free for 3 months from signup date
- After 3 months: ₹499/month (Starter — Modules 1 + 2)
- Payment: Razorpay (UPI, cards, NetBanking)

### Free period enforcement
- At expiry: 7-day grace period, then read-only until payment

---

## 14. GO-TO-MARKET

### First 10 customers — walk-in approach
Visit restaurants physically in your city.

**Target restaurants:**
- Menus not updated in 6+ months
- Zomato rating 3.5–4.2
- North Indian / Multi-cuisine
- Single outlet, family-run

**The 60-second pitch:**
> "Do you know which dish on your menu is losing you the most money right now? Most owners don't. KitchenIQ's AI tells you instantly. Can I show you — takes 4 minutes."

**The demo:**
1. Open KitchenIQ
2. Photograph their menu
3. AI imports dishes (60 seconds)
4. Enter 3–4 ingredient prices
5. Show margin on their most popular dish

---

## 15. SUCCESS METRICS

### Activation
- % who complete photo import: target 60%
- % who see first margin: target 70%
- Time to first margin: target < 5 minutes

### Engagement
- Day 3 return rate: target 40%
- % who add 5+ recipes in Week 1: target 35%
- % who update ingredient prices in Week 1: target 50%

### Retention
- Day 30 active rate: target 45%
- Free-to-paid conversion at Month 3: target 20%

### Quality
- Menu photo import accuracy: target 85%+
- AI tip relevance (not dismissed < 5 seconds): target 70%
- App crash rate: 0 per 100 sessions
- Page load: 100% under 3s on 4G

---

## 16. KNOWN RISKS & MITIGATIONS

| Risk | Likelihood | Mitigation |
|---|---|---|
| Menu photo import fails on low-quality photos | High | Multi-photo support, manual fallback always available |
| AI cost estimates inaccurate | Medium | Always labelled as estimates, easy to adjust |
| Ingredient prices go stale | High | Weekly in-app nudge, "last updated X days ago" warning |
| Owner doesn't understand margin % | Medium | Always show ₹ profit alongside %, AI explains in plain English |
| Claude API latency > 3s | Medium | Cache tips 24h, show async, never block UI |
| Owner churns at free period end | Medium | Ensure 10+ recipes and 1 AI insight acted on before Month 3 |

---

## 17. OPEN DECISIONS

1. **Auth in test phase** — email OTP (current) or bypass auth entirely for beta testers?
2. **Menu photo import model** — Claude claude-sonnet-4-6 with vision, or dedicated OCR (Google Vision, AWS Textract) + Claude for structuring?
3. **AI cost estimation accuracy bar** — test with 5 real menus before committing to this as primary onboarding.
4. **AI summary card refresh rate** — every app open vs. once per day (cached).
5. **Nutrition for unknown ingredients** — Claude estimates (flagged) vs. show "unknown" vs. block label generation.
6. **Production database** — Supabase vs. alternatives. Decision before launch.
7. **Production auth** — phone OTP at launch (Twilio ~₹0.60/SMS, trivial at scale).
8. **AI insights screen** — standalone tab in bottom nav or surfaced inline on dashboard?
9. **Ingredient price nudge** — in-app banner only vs. email reminder vs. push notification.
10. **White-glove onboarding** — for first 5–10 beta users, manually enter their data to bypass cold-start problem and prove value faster.

---

## 18. AGENT INSTRUCTIONS

This spec is written for an AI coding agent that will build KitchenIQ from scratch. The agent must follow these rules without exception:

1. **Nothing is pre-built.** Assume a completely empty project. Do not reference any existing files or assume any code already exists.

2. **Follow the design system exactly.** Every colour, every animation, every component rule in Section 10 is mandatory. No deviations.

3. **Build screens in this order:**
   - Phase 1: Config files, Supabase client, types, cost calculator lib
   - Phase 2: Auth screens (Splash, OTP)
   - Phase 3: Onboarding (Restaurant setup, photo import, ingredient picker)
   - Phase 4: Core screens (Dashboard, Recipe list, Recipe detail)
   - Phase 5: Input screens (Add/edit recipe, Ingredient manager)
   - Phase 6: AI features (AI tip, price spike alert, insights)
   - Phase 7: Nutrition label screen
   - Phase 8: Settings

4. **Every screen must have the dark header** with the full atmospheric glow and spice particle animation from Section 10.

5. **Every button is `#7C3AED`** with white text and the purple box shadow. No exceptions.

6. **The stat blocks on the dashboard** must use the tinted card system (deep coloured bg + glowing number) exactly as specified in Section 6.3.

7. **All Lucide icons** must have `strokeWidth={1.5}`.

8. **All page transitions** must use Framer Motion spring physics as specified in Section 10.

9. **Never store computed values** (margin %, total cost, profit). Always calculate live.

10. **Claude API calls** must go through Supabase Edge Functions only — never directly from the browser.

---

*This spec is the single source of truth for KitchenIQ v3.0. Any feature, screen, or behaviour not described here is out of scope. Any ambiguity should be resolved by returning to Section 1 (what KitchenIQ is) and Section 2 (who the customer is). The AI-native positioning in Section 1 and the design system in Section 10 take precedence over all other decisions.*
