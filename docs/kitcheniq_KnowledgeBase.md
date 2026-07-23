# KitchenIQ — Static Seed Knowledge Base

**Version:** 1.0  
**City:** Pune (beta)  
**Ingredient count:** 123  
**Last updated:** July 2026

---

## What it is

A pre-populated set of 123 ingredients with Pune baseline prices that every new restaurant gets automatically on day one. It lives in two tables — `kb_ingredients` (the master list) and `kb_ingredient_prices` (the Pune prices). It requires no owner input, no Agmarknet connection, and no cron job to be running. It just exists from the moment the migration runs.

---

## Why it exists

Without it, a new owner who opens KitchenIQ has no prices for any ingredient. Every margin calculation returns zero or null. The product is useless until they manually enter prices for every ingredient they use — which they won't do.

The seed KB means the moment an owner adds their first dish, there's already a reasonable price behind every ingredient. Margins are calculated immediately. The product delivers value in the first session.

This is directly tied to the core activation target — **time to first margin under 5 minutes**. The seed KB is what makes that possible.

---

## What's in it

123 ingredients across 9 categories covering Indian multi-cuisine and Pune fine dine continental.

| Category | Count | Price source |
|---|---|---|
| Vegetables | 26 | Agmarknet modal × 1.40 |
| Dairy | 13 | BigBasket Pune manual seed |
| Meat & Eggs | 9 | Pune local market manual seed |
| Grains & Pulses | 27 | Agmarknet modal × 1.25 |
| Spices | 24 | Agmarknet modal × 1.30 |
| Oils | 7 | Branded MRP manual seed |
| Dry Fruits & Nuts | 3 | Agmarknet modal × 1.25 |
| Pantry | 19 | Mixed — Agmarknet + fixed MRP |
| Continental / packaged | 14 | Fixed MRP — no Agmarknet |

---

## How prices are derived

Three methods depending on ingredient type.

### Agmarknet-tracked ingredients

Wholesale modal price pulled from Agmarknet, converted from quintal to kg (÷ 100), then multiplied by a category retail multiplier to estimate what a Pune restaurant owner actually pays.

**Example:** Tomato at ₹2,800/quintal → ₹28/kg wholesale × 1.40 = **₹39.20/kg** stored in KB.

#### Retail multipliers by category

| Category | Multiplier | Rationale |
|---|---|---|
| Vegetables | 1.40 | High perishability, doorstep delivery markup |
| Meat & Eggs | 1.35 | Wet market pricing, cold chain cost |
| Dairy | 1.30 | Organised supply (Amul, Mahananda) |
| Spices | 1.30 | Bought in small retail quantities |
| Pulses & Grains | 1.25 | Stable pricing, bulk buying common |
| Oils | 1.20 | Branded MRP-driven, less variance |
| Nuts & Dry Fruits | 1.25 | Wholesale market well-organised |
| Continental / packaged | 1.00 | Fixed MRP — Agmarknet not applicable |

### Manual seed ingredients

Dairy, proteins, and some pantry items not well-covered by Agmarknet. Prices researched from BigBasket Pune and local market rates as of July 2026. Stored directly as ₹/kg.

### Fixed MRP ingredients

Packaged continental items — pasta, schezwan sauce, olive oil, sauces. Agmarknet has no coverage for these. Prices seeded from branded retail MRP. These need a **manual quarterly review** since Agmarknet will not auto-update them.

---

## Price storage convention

All prices stored as **₹/kg** (or ₹/litre for liquids, ₹/piece for count items such as eggs and bread). This matches the existing `ingredient_library.price_per_kg` convention in the app.

Prices are never stored in grams or ml in the KB — conversion to recipe units happens at calculation time in the Edge Function.

---

## What the seed is not

It is not ground truth. The prices are estimates — good enough to give an owner a directionally correct margin on day one, not accurate enough to make a sourcing decision.

Accuracy improves over time in two ways:

1. **Agmarknet cron** — updates all Agmarknet-tracked ingredients daily at 6 AM IST with live modal prices from APMC Pune.
2. **Owner price logs** — when an owner manually enters what they actually paid, it is logged with `source = 'owner'` and overrides the KB price for 7 days. Over time, owner logs calibrate KB accuracy restaurant by restaurant.

---

## Important flag — price staleness

The seed prices are July 2026 estimates. If the migration is run significantly later, vegetable prices especially will have drifted.

**Before go-live:** spot-check 10–15 key ingredients against current Agmarknet data and update the seed if anything is materially off.

Tomato in particular is highly seasonal — it can swing 3× between months. Always verify tomato, onion, and green chilli before launching a new city.

---

## Related files

| File | Purpose |
|---|---|
| `supabase/migrations/20260717_kb_migration.sql` | Full migration — schema, seed, and library linking |
| `supabase/functions/agmarknet-sync/index.ts` | Daily cron that updates KB prices from Agmarknet |
| `supabase/functions/kb-matcher/index.ts` | Matches owner ingredients to KB on insert |

---

## Related decisions

| Decision | Choice made | Rationale |
|---|---|---|
| Shared vs per-restaurant KB | Shared (`kb_ingredients`, no `restaurant_id`) | Cron cannot efficiently update per-restaurant rows at scale |
| Price storage unit | ₹/kg (purchase unit) | Matches existing app convention, readable |
| KB vs ingredient_library | Separate tables, linked by FK | Keeps owner data and KB data clean and independent |
| Owner price priority window | 7 days | Long enough to respect manual updates, short enough to not go stale |
| Continental ingredients | Fixed MRP, no Agmarknet | Packaged goods have stable branded pricing, Agmarknet doesn't cover them |
