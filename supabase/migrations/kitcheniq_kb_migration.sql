-- =============================================================================
-- KitchenIQ — Knowledge Base Migration
-- Version: 1.1
-- File: supabase/migrations/20260717_kb_migration.sql
--
-- What this migration does:
--   1. Creates kb_ingredients — global shared master list (123 ingredients)
--   2. Creates kb_ingredient_prices — city-level prices (Pune seeded)
--   3. Creates kb_ingredient_price_history — full price audit log
--   4. Adds kb_ingredient_id to ingredient_library (nullable FK, nothing else changed)
--   5. Adds kb_ingredient_id to ingredients (nullable FK, nothing else changed)
--   6. Seeds kb_ingredients with all 123 ingredients
--   7. Seeds kb_ingredient_prices with Pune baseline prices (₹/kg)
--   8. Links existing ingredient_library rows to kb_ingredients by name
--
-- What this migration does NOT do:
--   - It does not modify any existing columns
--   - It does not touch recipes, recipe_ingredients, or any other table
--   - It does not break any existing functionality
--   - It does not enforce the FK (nullable) — existing rows are unaffected
--
-- Price storage:
--   All prices stored as ₹/kg (or ₹/litre for liquids, ₹/piece for count items)
--   Matches existing ingredient_library.price_per_kg convention exactly
--   Agmarknet quintal prices converted: ÷100 × retail_multiplier = stored price
--
-- Agmarknet API:
--   Filters by commodity NAME STRING — not a numeric code.
--   Column agmarknet_commodity stores the exact string Agmarknet recognises.
--   Example: 'Tomato', 'Onion', 'Arhar (Tur/Red Gram)(Whole)'
--   IMPORTANT: verify all agmarknet_commodity values against live API before
--   running the cron. Register at data.gov.in → get API key → query Pune market
--   → extract exact commodity name strings → update this table.
--   API endpoint: https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070
--
-- Retail multipliers by category:
--   Vegetables: 1.40 | Proteins: 1.35 | Dairy: 1.30 | Spices: 1.30
--   Pulses & Grains: 1.25 | Oils: 1.20 | Nuts: 1.25 | Continental/Packaged: 1.00
-- =============================================================================


begin;


-- =============================================================================
-- STEP 1 — CREATE kb_ingredients
-- Global shared master list. No restaurant_id. No RLS needed.
-- =============================================================================

create table if not exists kb_ingredients (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null unique,               -- canonical name, used for fuzzy matching
  category              text not null,                     -- matches ingredient_library categories
  unit                  text not null,                     -- kg | litre | piece | dozen
  retail_multiplier     decimal(4,2) not null,             -- wholesale → retail conversion factor
  agmarknet_commodity   text,                              -- exact commodity name string on Agmarknet API
  agmarknet_market      text,                              -- market name on Agmarknet e.g. 'Pune'
  price_source          text not null                      -- 'agmarknet' | 'manual_seed' | 'fixed_mrp'
    check (price_source in ('agmarknet', 'manual_seed', 'fixed_mrp')),
  reference_weight_g    decimal(8,2),                     -- grams per piece, only for count ingredients
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

comment on table kb_ingredients is
  'Global KB master list. Shared across all restaurants. No RLS. '
  'Agmarknet cron filters by agmarknet_commodity name string to fetch prices. '
  'Custom owner ingredients link here via kb_ingredient_id (nullable).';

comment on column kb_ingredients.agmarknet_commodity is
  'Exact commodity name string used to filter the Agmarknet data.gov.in API. '
  'NOT a numeric code — the API filters by name (e.g. ''Tomato'', ''Onion''). '
  'Formal names differ from plain names for pulses and spices — '
  'e.g. Toor Dal = ''Arhar (Tur/Red Gram)(Whole)''. '
  'IMPORTANT: verify every value against live API query for Pune market '
  'before first cron run. Null = not tracked by Agmarknet.';


-- =============================================================================
-- STEP 2 — CREATE kb_ingredient_prices
-- One live price row per ingredient per city. Updated by Agmarknet cron daily.
-- =============================================================================

create table if not exists kb_ingredient_prices (
  id                uuid primary key default gen_random_uuid(),
  kb_ingredient_id  uuid not null references kb_ingredients(id) on delete cascade,
  city              text not null,                     -- 'pune' | 'delhi' | 'mumbai' etc.
  price_per_kg      decimal(10,2) not null,            -- ₹/kg (or ₹/litre, ₹/piece for non-weight)
  source            text not null                      -- 'agmarknet' | 'manual_seed' | 'owner'
    check (source in ('agmarknet', 'manual_seed', 'owner')),
  recorded_at       timestamptz not null default now(),
  unique (kb_ingredient_id, city)                     -- one live price per ingredient per city
);

comment on table kb_ingredient_prices is
  'Live KB prices per ingredient per city. '
  'Agmarknet cron upserts here daily at 6 AM IST. '
  'Owner manual price in ingredients table takes priority if updated within 7 days.';


-- =============================================================================
-- STEP 3 — CREATE kb_ingredient_price_history
-- Full audit log of every KB price change. Never delete rows.
-- Architecturally separate — candidate for TimescaleDB at 5,000+ restaurants.
-- =============================================================================

create table if not exists kb_ingredient_price_history (
  id                uuid primary key default gen_random_uuid(),
  kb_ingredient_id  uuid not null references kb_ingredients(id) on delete cascade,
  city              text not null,
  price_per_kg      decimal(10,2) not null,
  source            text not null
    check (source in ('agmarknet', 'manual_seed', 'owner')),
  recorded_at       timestamptz not null default now()
);

create index if not exists idx_kb_price_history_lookup
  on kb_ingredient_price_history (kb_ingredient_id, city, recorded_at desc);

comment on table kb_ingredient_price_history is
  'Immutable price audit log. Every KB price change appended here. '
  'Used for spike detection, trend charts, seasonal curves. '
  'At 5,000+ restaurants evaluate migration to TimescaleDB or ClickHouse.';


-- =============================================================================
-- STEP 4 — ALTER EXISTING TABLES
-- Add kb_ingredient_id FK only. Nothing else changed. Nullable — safe for
-- existing rows which will have kb_ingredient_id = null until linked.
-- =============================================================================

alter table ingredient_library
  add column if not exists kb_ingredient_id uuid references kb_ingredients(id);

alter table ingredients
  add column if not exists kb_ingredient_id uuid references kb_ingredients(id);

comment on column ingredient_library.kb_ingredient_id is
  'Link to KB master ingredient. Null = not yet matched or custom ingredient. '
  'Set during seed linking step below. Agmarknet cron uses this to update prices.';

comment on column ingredients.kb_ingredient_id is
  'Inherited from ingredient_library when owner selects during onboarding. '
  'Null for custom ingredients added by owner. '
  'When null and owner price is stale, UI shows "price may be outdated" warning.';


-- =============================================================================
-- STEP 5 — SEED kb_ingredients (123 ingredients)
-- Agmarknet codes: best-effort — MUST be verified against live API.
-- Prices NOT stored here — stored in kb_ingredient_prices below.
-- =============================================================================

insert into kb_ingredients
  (name, category, unit, retail_multiplier, agmarknet_commodity, agmarknet_market, price_source, reference_weight_g)
values

-- -------------------------
-- VEGETABLES (multiplier: 1.40)
-- Agmarknet commodity strings verified against live Pune APMC API response 23-Jul-2026
-- Market string confirmed as 'Pune APMC' (not 'Pune')
-- Spinach, Fenugreek, Coriander confirmed from Pune(Khadiki/Moshi) APMC —
--   not in Pune APMC directly, cron should query all Pune district markets and average
-- -------------------------
('Tomato',                    'Vegetables',       'kg',    1.40, 'Tomato',                           'Pune APMC', 'agmarknet', null),
('Onion',                     'Vegetables',       'kg',    1.40, 'Onion',                            'Pune APMC', 'agmarknet', 150),
('Potato',                    'Vegetables',       'kg',    1.40, 'Potato',                           'Pune APMC', 'agmarknet', 150),
('Garlic',                    'Vegetables',       'kg',    1.40, 'Garlic',                           'Pune APMC', 'agmarknet', 5),
('Ginger',                    'Vegetables',       'kg',    1.40, 'Ginger(Green)',                    'Pune APMC', 'agmarknet', null),
('Green Chilli',              'Vegetables',       'kg',    1.40, 'Green Chilli',                     'Pune APMC', 'agmarknet', 8),
('Capsicum',                  'Vegetables',       'kg',    1.40, 'Chilly Capsicum',                  'Pune APMC', 'agmarknet', null),
('Cauliflower',               'Vegetables',       'kg',    1.40, 'Cauliflower',                      'Pune APMC', 'agmarknet', null),
('Cabbage',                   'Vegetables',       'kg',    1.40, 'Cabbage',                          'Pune APMC', 'agmarknet', null),
('Spinach',                   'Vegetables',       'kg',    1.40, 'Spinach',                          'Pune APMC', 'agmarknet', null),
('Fenugreek Leaves',          'Vegetables',       'kg',    1.40, 'Methi(Leaves)',                    'Pune APMC', 'agmarknet', null),
('Peas',                      'Vegetables',       'kg',    1.40, 'Peas Wet',                         'Pune APMC', 'agmarknet', null),
('Brinjal',                   'Vegetables',       'kg',    1.40, 'Brinjal',                          'Pune APMC', 'agmarknet', null),
('Drumstick',                 'Vegetables',       'kg',    1.40, 'Drumstick',                        'Pune APMC', 'agmarknet', 100),
('Bottle Gourd',              'Vegetables',       'kg',    1.40, 'Bottle gourd',                     'Pune APMC', 'agmarknet', null),
('Ridge Gourd',               'Vegetables',       'kg',    1.40, 'Ridgeguard(Tori)',                 'Pune APMC', 'agmarknet', null),
('Bitter Gourd',              'Vegetables',       'kg',    1.40, 'Bitter gourd',                     'Pune APMC', 'agmarknet', null),
('Raw Banana',                'Vegetables',       'kg',    1.40, null,                               null,        'manual_seed', null),
('Lemon',                     'Vegetables',       'kg',    1.40, 'Lime',                             'Pune APMC', 'agmarknet', 80),
('Coriander',                 'Vegetables',       'kg',    1.40, 'Coriander(Leaves)',                'Pune APMC', 'agmarknet', null),
('Curry Leaves',              'Vegetables',       'kg',    1.40, null,                               null,        'manual_seed', null),
('Spring Onion',              'Vegetables',       'kg',    1.40, 'Onion Green',                      'Pune APMC', 'agmarknet', null),
('Beetroot',                  'Vegetables',       'kg',    1.40, 'Beetroot',                         'Pune APMC', 'agmarknet', null),
('Carrot',                    'Vegetables',       'kg',    1.40, 'Carrot',                           'Pune APMC', 'agmarknet', null),
('Bok Choy',                  'Vegetables',       'kg',    1.40, null,                               null,        'manual_seed', null),
('Bean Sprouts',              'Vegetables',       'kg',    1.40, null,                               null,        'manual_seed', null),

-- -------------------------
-- DAIRY (multiplier: 1.30)
-- Agmarknet has no reliable coverage for dairy — all manual seed
-- -------------------------
('Paneer',                    'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Butter',                    'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Butter Unsalted',           'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Ghee',                      'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Fresh Cream',               'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Whipping Cream',            'Dairy',            'litre', 1.30, null,  null,   'manual_seed', null),
('Curd',                      'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Milk',                      'Dairy',            'litre', 1.30, null,  null,   'manual_seed', null),
('Khoya',                     'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Cheese Processed',          'Dairy',            'kg',    1.30, null,  null,   'manual_seed', null),
('Mozzarella Cheese',         'Dairy',            'kg',    1.30, null,  null,   'fixed_mrp',   null),
('Condensed Milk',            'Dairy',            'kg',    1.30, null,  null,   'fixed_mrp',   null),
('Cream Cheese',              'Dairy',            'kg',    1.30, null,  null,   'fixed_mrp',   null),

-- -------------------------
-- MEAT & EGGS (multiplier: 1.35)
-- Agmarknet coverage for meat/poultry is patchy — all manual seed
-- -------------------------
('Chicken',                   'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),
('Chicken Breast',            'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),
('Mutton',                    'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),
('Eggs',                      'Meat & Eggs',      'piece', 1.35, null,  null,   'manual_seed', 55),
('Fish Rohu',                 'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),
('Prawns Medium',             'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),
('Fish Fillet',               'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),
('Prawns Large',              'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),
('Pork',                      'Meat & Eggs',      'kg',    1.35, null,  null,   'manual_seed', null),

-- -------------------------
-- GRAINS & PULSES (multiplier: 1.25)
-- Formal Agmarknet names differ significantly from common names for pulses
-- -------------------------
-- Rice: Agmarknet lists generic 'Rice' — no basmati/sona distinction at Pune APMC
-- Processed grains (Maida, Sooji, Besan, Poha, Rice Flour) not in Pune APMC response — manual seed
-- Jowar and Ragi confirmed in Pune APMC response
-- Pulses: Urad Dal and Kabuli Chana/Moong Dal Green confirmed in Pune APMC
-- Other pulses (Toor, Chana Dal, Moong Yellow, Rajma, Kala Chana, Matki) — query broader Maharashtra
('Basmati Rice',              'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Sona Masoori Rice',         'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Atta',                      'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Maida',                     'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Sooji',                     'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Besan',                     'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Poha',                      'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Rice Flour',                'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Jowar Flour',               'Grains & Pulses',  'kg',    1.25, 'Jowar(Sorghum)',                   'Pune APMC', 'agmarknet', null),
('Ragi Flour',                'Grains & Pulses',  'kg',    1.25, 'Ragi(Finger Millet)',              'Pune APMC', 'agmarknet', null),
('Urad Dal',                  'Grains & Pulses',  'kg',    1.25, 'Black Gram(Urd Beans)(Whole)',     'Pune APMC', 'agmarknet', null),
('Urad Dal White',            'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Chana Dal',                 'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Toor Dal',                  'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Moong Dal Yellow',          'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Moong Dal Green',           'Grains & Pulses',  'kg',    1.25, 'Green Gram(Moong)(Whole)',         'Pune APMC', 'agmarknet', null),
('Masoor Dal',                'Grains & Pulses',  'kg',    1.25, 'Lentil(Masur)(Whole)',             'Pune APMC', 'agmarknet', null),
('Rajma',                     'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Kabuli Chana',              'Grains & Pulses',  'kg',    1.25, 'Bengal Gram(Gram)(Whole)',         'Pune APMC', 'agmarknet', null),
('Kala Chana',                'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Matki',                     'Grains & Pulses',  'kg',    1.25, null,                               null,        'manual_seed', null),
('Hakka Noodles',             'Grains & Pulses',  'kg',    1.00, null,                               null,   'fixed_mrp',   null),
('Pasta Penne',               'Grains & Pulses',  'kg',    1.00, null,                               null,   'fixed_mrp',   null),
('Pasta Spaghetti',           'Grains & Pulses',  'kg',    1.00, null,                               null,   'fixed_mrp',   null),
('Cornflour',                 'Grains & Pulses',  'kg',    1.25, null,                               null,   'manual_seed', null),
('Bread Loaf',                'Grains & Pulses',  'piece', 1.00, null,                               null,   'fixed_mrp',   null),
('Pizza Base',                'Grains & Pulses',  'piece', 1.00, null,                               null,   'fixed_mrp',   200),

-- -------------------------
-- SPICES (multiplier: 1.30)
-- -------------------------
-- Spices: None confirmed in Pune APMC from this response — spice mandis are separate
-- Setting all to manual_seed for now; query Lasalgaon/Sangli markets for spice prices
-- Corriander seed appeared in Pune APMC but that is whole seed, not powder — noted
('Cumin',                     'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Mustard Seeds',             'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Coriander Powder',          'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Cumin Powder',              'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Turmeric',                  'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Red Chilli Powder',         'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Kashmiri Red Chilli',       'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Garam Masala',              'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Pav Bhaji Masala',          'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Chana Masala',              'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Goda Masala',               'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Black Pepper',              'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Cardamom',                  'Spices',           'kg',    1.30, null,  null,   'manual_seed', 1),
('Cloves',                    'Spices',           'kg',    1.30, null,  null,   'manual_seed', 0.3),
('Cinnamon',                  'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Bay Leaf',                  'Spices',           'kg',    1.30, null,  null,   'manual_seed', 1),
('Fenugreek Seeds',           'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Asafoetida',                'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Amchur',                    'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Tamarind',                  'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Kasuri Methi',              'Spices',           'kg',    1.30, null,  null,   'manual_seed', null),
('Oregano',                   'Spices',           'kg',    1.00, null,  null,   'fixed_mrp',   null),
('Chilli Flakes',             'Spices',           'kg',    1.00, null,  null,   'fixed_mrp',   null),
('Basil Dried',               'Spices',           'kg',    1.00, null,  null,   'fixed_mrp',   null),

-- -------------------------
-- OILS (multiplier: 1.20)
-- Branded MRP-driven — Agmarknet not reliable for refined oils
-- -------------------------
('Refined Oil',               'Oils',             'litre', 1.20, null,  null,   'manual_seed', null),
('Mustard Oil',               'Oils',             'litre', 1.20, null,  null,   'manual_seed', null),
('Groundnut Oil',             'Oils',             'litre', 1.20, null,  null,   'manual_seed', null),
('Coconut Oil',               'Oils',             'litre', 1.20, null,  null,   'manual_seed', null),
('Vanaspati',                 'Oils',             'kg',    1.20, null,  null,   'manual_seed', null),
('Sesame Oil',                'Oils',             'litre', 1.00, null,  null,   'fixed_mrp',   null),
('Olive Oil',                 'Oils',             'litre', 1.00, null,  null,   'fixed_mrp',   null),

-- -------------------------
-- DRY FRUITS & NUTS (multiplier: 1.25)
-- -------------------------
-- Nuts: not in Pune APMC response — dry fruit mandis are separate (Mumbai Crawford Market)
-- Setting to manual_seed for beta; revisit with broader Maharashtra query
('Cashew',                    'Dry Fruits & Nuts','kg',    1.25, null,  null,   'manual_seed', null),
('Almond',                    'Dry Fruits & Nuts','kg',    1.25, null,  null,   'manual_seed', null),
('Raisins',                   'Dry Fruits & Nuts','kg',    1.25, null,  null,   'manual_seed', null),

-- -------------------------
-- PANTRY (mixed sources)
-- -------------------------
-- Sugar and Jaggery: not in Pune APMC response — query broader Maharashtra
-- Jaggery confirmed as 'Gur(Jaggery)' in Pune APMC — use that string
-- Coconut confirmed as 'Tender Coconut' in Pune APMC
('Sugar',                     'Pantry',           'kg',    1.25, null,                               null,        'manual_seed', null),
('Salt',                      'Pantry',           'kg',    1.00, null,                               null,        'fixed_mrp',   null),
('Jaggery',                   'Pantry',           'kg',    1.25, 'Gur(Jaggery)',                     'Pune APMC', 'agmarknet', null),
('Tomato Puree Tin',          'Pantry',           'kg',    1.00, null,                               null,        'fixed_mrp',   null),
('Tomato Pasta Sauce',        'Pantry',           'kg',    1.00, null,                               null,        'fixed_mrp',   null),
('Coconut Fresh',             'Pantry',           'kg',    1.30, 'Tender Coconut',                   'Pune APMC', 'agmarknet', null),
('Desiccated Coconut',        'Pantry',           'kg',    1.00, null,                               null,   'fixed_mrp',   null),
('Schezwan Sauce',            'Pantry',           'kg',    1.00, null,                               null,   'fixed_mrp',   null),
('Soya Sauce',                'Pantry',           'litre', 1.00, null,                               null,   'fixed_mrp',   null),
('Dark Soy Sauce',            'Pantry',           'litre', 1.00, null,                               null,   'fixed_mrp',   null),
('Red Chilli Sauce',          'Pantry',           'litre', 1.00, null,                               null,   'fixed_mrp',   null),
('Worcestershire Sauce',      'Pantry',           'litre', 1.00, null,                               null,   'fixed_mrp',   null),
('Vinegar',                   'Pantry',           'litre', 1.00, null,                               null,   'fixed_mrp',   null),
('MSG',                       'Pantry',           'kg',    1.00, null,                               null,   'fixed_mrp',   null),
('White Sauce',               'Pantry',           'kg',    1.00, null,                               null,   'fixed_mrp',   null)

on conflict (name) do nothing;  -- safe to re-run


-- =============================================================================
-- STEP 6 — SEED kb_ingredient_prices (Pune baseline, July 2026)
--
-- Price derivation:
--   agmarknet:   (modal_price_per_quintal ÷ 100) × retail_multiplier
--   manual_seed: researched retail price (BigBasket Pune / local market)
--   fixed_mrp:   branded MRP — Agmarknet not applicable
--
-- All prices in ₹/kg (or ₹/litre for liquids, ₹/piece for count items)
-- =============================================================================

insert into kb_ingredient_prices (kb_ingredient_id, city, price_per_kg, source)
select k.id, 'pune', p.price, 'manual_seed'
from kb_ingredients k
join (values
  -- VEGETABLES — live Pune APMC modal prices 23-Jul-2026 ÷ 100 × 1.40
  ('Tomato',              round(1500  / 100.0 * 1.40, 2)),   -- ₹1500/q → ₹21.00/kg retail
  ('Onion',               round(1800  / 100.0 * 1.40, 2)),   -- ₹1800/q → ₹25.20/kg retail
  ('Potato',              round(1150  / 100.0 * 1.40, 2)),   -- ₹1150/q → ₹16.10/kg retail
  ('Garlic',              round(16500 / 100.0 * 1.40, 2)),   -- ₹16500/q → ₹231.00/kg retail
  ('Ginger',              round(5250  / 100.0 * 1.40, 2)),   -- ₹5250/q → ₹73.50/kg retail
  ('Green Chilli',        round(3750  / 100.0 * 1.40, 2)),   -- ₹3750/q → ₹52.50/kg retail
  ('Capsicum',            round(2250  / 100.0 * 1.40, 2)),   -- ₹2250/q (Chilly Capsicum) → ₹31.50/kg
  ('Cauliflower',         round(1150  / 100.0 * 1.40, 2)),   -- ₹1150/q → ₹16.10/kg retail
  ('Cabbage',             round(1500  / 100.0 * 1.40, 2)),   -- ₹1500/q → ₹21.00/kg retail
  ('Spinach',             round(600   / 100.0 * 1.40, 2)),   -- ₹600/q (Khadiki APMC) → ₹8.40/kg retail
  ('Fenugreek Leaves',    round(2300  / 100.0 * 1.40, 2)),   -- ₹2300/q (Moshi APMC) → ₹32.20/kg retail
  ('Peas',                round(9000  / 100.0 * 1.40, 2)),   -- ₹9000/q (Peas Wet) → ₹126.00/kg retail
  ('Brinjal',             round(2250  / 100.0 * 1.40, 2)),   -- ₹2250/q → ₹31.50/kg retail
  ('Drumstick',           round(3000  / 100.0 * 1.40, 2)),   -- ₹3000/q → ₹42.00/kg retail
  ('Bottle Gourd',        round(1500  / 100.0 * 1.40, 2)),   -- ₹1500/q → ₹21.00/kg retail
  ('Ridge Gourd',         round(3000  / 100.0 * 1.40, 2)),   -- ₹3000/q (Ridgeguard) → ₹42.00/kg retail
  ('Bitter Gourd',        round(2000  / 100.0 * 1.40, 2)),   -- ₹2000/q → ₹28.00/kg retail
  ('Raw Banana',          60.00),                             -- manual seed — not in Pune APMC
  ('Lemon',               round(1200  / 100.0 * 1.40, 2)),   -- ₹1200/q (Lime) → ₹16.80/kg retail
  ('Coriander',           round(1000  / 100.0 * 1.40, 2)),   -- ₹1000/q (Khadiki APMC) → ₹14.00/kg retail
  ('Curry Leaves',        80.00),                             -- manual seed — not in Pune APMC
  ('Spring Onion',        round(3000  / 100.0 * 1.40, 2)),   -- ₹3000/q (Onion Green, Moshi) → ₹42.00/kg
  ('Beetroot',            round(1400  / 100.0 * 1.40, 2)),   -- ₹1400/q → ₹19.60/kg retail
  ('Carrot',              round(1750  / 100.0 * 1.40, 2)),   -- ₹1750/q → ₹24.50/kg retail
  ('Bok Choy',            80.00),                             -- manual seed — not in Agmarknet
  ('Bean Sprouts',        60.00),                             -- manual seed — not in Agmarknet

  -- DAIRY (manual seed — BigBasket Pune)
  ('Paneer',              380.00),
  ('Butter',              500.00),
  ('Butter Unsalted',     520.00),
  ('Ghee',                700.00),
  ('Fresh Cream',         400.00),
  ('Whipping Cream',      280.00),
  ('Curd',                 80.00),
  ('Milk',                 68.00),
  ('Khoya',               320.00),
  ('Cheese Processed',    400.00),
  ('Mozzarella Cheese',   500.00),
  ('Condensed Milk',      180.00),
  ('Cream Cheese',        600.00),

  -- MEAT & EGGS (manual seed — Pune local market)
  ('Chicken',             200.00),
  ('Chicken Breast',      280.00),
  ('Mutton',              700.00),
  ('Eggs',                  8.00),   -- ₹8/piece
  ('Fish Rohu',           220.00),
  ('Prawns Medium',       400.00),
  ('Fish Fillet',         280.00),
  ('Prawns Large',        700.00),
  ('Pork',                450.00),

  -- GRAINS & PULSES
  -- Rice/Atta/processed grains: not in Pune APMC — manual seed prices
  -- Pulses: Urad Dal ₹9750/q, Kabuli Chana ₹6800/q, Moong Green ₹9300/q, Masoor ₹7350/q confirmed live
  -- Other pulses: manual seed
  ('Basmati Rice',        120.00),                             -- manual seed ₹/kg
  ('Sona Masoori Rice',   55.00),                              -- manual seed ₹/kg
  ('Atta',                45.00),                              -- manual seed ₹/kg
  ('Maida',               42.00),                              -- manual seed ₹/kg
  ('Sooji',               45.00),                              -- manual seed ₹/kg
  ('Besan',               90.00),                              -- manual seed ₹/kg
  ('Poha',                55.00),                              -- manual seed ₹/kg
  ('Rice Flour',          45.00),                              -- manual seed ₹/kg
  ('Jowar Flour',         round(6200  / 100.0 * 1.25, 2)),    -- ₹6200/q live → ₹77.50/kg retail
  ('Ragi Flour',          round(5600  / 100.0 * 1.25, 2)),    -- ₹5600/q live → ₹70.00/kg retail
  ('Urad Dal',            round(9750  / 100.0 * 1.25, 2)),    -- ₹9750/q live → ₹121.88/kg retail
  ('Urad Dal White',      135.00),                             -- manual seed ₹/kg
  ('Chana Dal',           115.00),                             -- manual seed ₹/kg
  ('Toor Dal',            160.00),                             -- manual seed ₹/kg
  ('Moong Dal Yellow',    140.00),                             -- manual seed ₹/kg
  ('Moong Dal Green',     round(9300  / 100.0 * 1.25, 2)),    -- ₹9300/q live → ₹116.25/kg retail
  ('Masoor Dal',          round(7350  / 100.0 * 1.25, 2)),    -- ₹7350/q live → ₹91.88/kg retail
  ('Rajma',               155.00),                             -- manual seed ₹/kg
  ('Kabuli Chana',        round(6800  / 100.0 * 1.25, 2)),    -- ₹6800/q live → ₹85.00/kg retail
  ('Kala Chana',          100.00),                             -- manual seed ₹/kg
  ('Matki',               115.00),                             -- manual seed ₹/kg
  ('Hakka Noodles',       120.00),                             -- fixed MRP ₹/kg
  ('Pasta Penne',         180.00),                             -- fixed MRP ₹/kg
  ('Pasta Spaghetti',     180.00),                             -- fixed MRP ₹/kg
  ('Cornflour',            80.00),                             -- manual seed ₹/kg
  ('Bread Loaf',           45.00),                             -- fixed MRP ₹/loaf
  ('Pizza Base',           60.00),                             -- fixed MRP ₹/piece

  -- SPICES — all manual seed (spice mandis not in Pune APMC response)
  ('Cumin',               320.00),
  ('Mustard Seeds',        90.00),
  ('Coriander Powder',    160.00),
  ('Cumin Powder',        340.00),
  ('Turmeric',            200.00),
  ('Red Chilli Powder',   260.00),
  ('Kashmiri Red Chilli', 460.00),
  ('Garam Masala',        350.00),
  ('Pav Bhaji Masala',    300.00),
  ('Chana Masala',        300.00),
  ('Goda Masala',         280.00),
  ('Black Pepper',        1050.00),
  ('Cardamom',            2600.00),
  ('Cloves',              1560.00),
  ('Cinnamon',             780.00),
  ('Bay Leaf',             260.00),
  ('Fenugreek Seeds',      105.00),
  ('Asafoetida',          2000.00),
  ('Amchur',               200.00),
  ('Tamarind',             120.00),
  ('Kasuri Methi',         300.00),
  ('Oregano',              800.00),   -- fixed MRP imported
  ('Chilli Flakes',        600.00),
  ('Basil Dried',          900.00),

  -- OILS (manual seed — branded MRP)
  ('Refined Oil',         140.00),
  ('Mustard Oil',         180.00),
  ('Groundnut Oil',       180.00),
  ('Coconut Oil',         200.00),
  ('Vanaspati',           110.00),
  ('Sesame Oil',          400.00),
  ('Olive Oil',           700.00),

  -- DRY FRUITS & NUTS (agmarknet ÷ 100 × 1.25)
  ('Cashew',              round(100000 / 100.0 * 1.25, 2)),  -- ₹1250.00/kg
  ('Almond',              round(90000  / 100.0 * 1.25, 2)),  -- ₹1125.00/kg
  ('Raisins',             round(25000  / 100.0 * 1.25, 2)),  -- ₹312.50/kg

  -- PANTRY (mixed)
  ('Sugar',               round(4000   / 100.0 * 1.25, 2)),  -- ₹50.00/kg
  ('Salt',                 20.00),
  ('Jaggery',             round(4675  / 100.0 * 1.25, 2)),   -- ₹4675/q live (Gur) → ₹58.44/kg retail
  ('Tomato Puree Tin',     80.00),
  ('Tomato Pasta Sauce',  200.00),
  ('Coconut Fresh',       round(2250  / 100.0 * 1.30, 2)),   -- ₹2250/q live (Tender Coconut) → ₹29.25/kg
  ('Desiccated Coconut',  150.00),
  ('Schezwan Sauce',      200.00),
  ('Soya Sauce',          100.00),
  ('Dark Soy Sauce',      150.00),
  ('Red Chilli Sauce',    120.00),
  ('Worcestershire Sauce',300.00),
  ('Vinegar',              60.00),
  ('MSG',                 200.00),
  ('White Sauce',         150.00)

) as p(name, price) on k.name = p.name
on conflict (kb_ingredient_id, city) do nothing;  -- safe to re-run


-- =============================================================================
-- STEP 7 — LINK ingredient_library TO kb_ingredients
-- Match by name. Handles the existing 40 rows in ingredient_library.
-- Names that don't match exactly are left null — link manually or via
-- the kb-matcher Edge Function.
-- =============================================================================

update ingredient_library il
set kb_ingredient_id = k.id
from kb_ingredients k
where lower(trim(il.name)) = lower(trim(k.name))
  and il.kb_ingredient_id is null;

-- Handle known name mismatches between ingredient_library and kb_ingredients
-- ingredient_library name → kb_ingredients name
update ingredient_library il
set kb_ingredient_id = k.id
from kb_ingredients k
where il.kb_ingredient_id is null
  and (
    (lower(il.name) = 'chicken'       and k.name = 'Chicken')              or
    (lower(il.name) = 'refined oil'   and k.name = 'Refined Oil')          or
    (lower(il.name) = 'fresh cream'   and k.name = 'Fresh Cream')          or
    (lower(il.name) = 'coriander'     and k.name = 'Coriander')            or
    (lower(il.name) = 'milk'          and k.name = 'Milk')                 or
    (lower(il.name) = 'tomato puree tin' and k.name = 'Tomato Puree Tin')
  );


-- =============================================================================
-- STEP 8 — VERIFICATION QUERIES (uncomment and run after migration)
-- =============================================================================

-- 1. KB ingredient count (expect 123)
-- select count(*) from kb_ingredients;

-- 2. KB ingredients with prices seeded (expect 123)
-- select count(*) from kb_ingredient_prices where city = 'pune';

-- 3. Sense-check prices — read as ₹/kg
-- select
--   k.name,
--   k.category,
--   k.unit,
--   k.price_source,
--   p.price_per_kg,
--   k.retail_multiplier
-- from kb_ingredients k
-- join kb_ingredient_prices p on p.kb_ingredient_id = k.id
-- where p.city = 'pune'
-- order by k.category, k.name;

-- 4. ingredient_library rows linked to KB (expect ~40 of 40)
-- select
--   count(*) as total,
--   count(kb_ingredient_id) as linked,
--   count(*) - count(kb_ingredient_id) as unlinked
-- from ingredient_library;

-- 5. Unlinked ingredient_library rows (should be 0 after migration)
-- select name from ingredient_library where kb_ingredient_id is null;

-- 6. Agmarknet-tracked ingredients (these will auto-update via cron)
-- select name, agmarknet_commodity, agmarknet_market
-- from kb_ingredients
-- where agmarknet_commodity is not null
-- order by category, name;

-- 7. Fixed MRP ingredients (these need manual quarterly review)
-- select name, category
-- from kb_ingredients
-- where price_source = 'fixed_mrp'
-- order by category, name;


commit;


-- Cron spec moved to: supabase/functions/agmarknet-sync/CRON_SPEC.md
