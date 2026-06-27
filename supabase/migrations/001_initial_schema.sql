-- KitchenIQ — Initial Schema
-- Migration: 001_initial_schema.sql

-- ─────────────────────────────────────────────
-- Utility: auto-update updated_at on row change
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────
-- 1. restaurants
-- ─────────────────────────────────────────────
CREATE TABLE restaurants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  city          text NOT NULL,
  cuisine_type  text NOT NULL,
  fssai_number  text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────
-- 2. ingredients
-- ─────────────────────────────────────────────
CREATE TABLE ingredients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  price_per_kg  numeric NOT NULL DEFAULT 0,
  unit          text NOT NULL DEFAULT 'kg',
  last_updated  timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 3. recipes
-- ─────────────────────────────────────────────
CREATE TABLE recipes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id    uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name             text NOT NULL,
  category         text NOT NULL DEFAULT 'Main Course',
  selling_price    numeric NOT NULL DEFAULT 0,
  wastage_percent  numeric NOT NULL DEFAULT 10,
  overhead_percent numeric NOT NULL DEFAULT 20,
  serves           integer NOT NULL DEFAULT 1,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────
-- 4. recipe_ingredients
-- ─────────────────────────────────────────────
CREATE TABLE recipe_ingredients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity      numeric NOT NULL,
  unit          text NOT NULL
);


-- ─────────────────────────────────────────────
-- 5. ingredient_price_history
-- ─────────────────────────────────────────────
CREATE TABLE ingredient_price_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price_per_kg  numeric NOT NULL,
  change_percent numeric,          -- nullable: first entry has no previous price
  recorded_at   timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 6. nutrition_data
-- ─────────────────────────────────────────────
CREATE TABLE nutrition_data (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id        uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE UNIQUE,
  energy_kcal      numeric,
  protein_g        numeric,
  carbs_g          numeric,
  sugars_g         numeric,
  fat_g            numeric,
  saturated_fat_g  numeric,
  fibre_g          numeric,
  sodium_mg        numeric,
  is_ai_estimate   boolean DEFAULT true,
  calculated_at    timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 7. ai_tips
-- ─────────────────────────────────────────────
CREATE TABLE ai_tips (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tip_text   text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);


-- ─────────────────────────────────────────────
-- 8. ai_insights
-- ─────────────────────────────────────────────
CREATE TABLE ai_insights (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  insight_type  text NOT NULL,
  recipe_id     uuid REFERENCES recipes(id) ON DELETE CASCADE,
  message       text NOT NULL,
  data          jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  dismissed_at  timestamptz
);


-- ─────────────────────────────────────────────
-- 9. menu_imports
-- ─────────────────────────────────────────────
CREATE TABLE menu_imports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  raw_claude_output jsonb,
  dishes_found      integer DEFAULT 0,
  status            text DEFAULT 'pending',
  created_at        timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 10. ingredient_library  (global reference — no RLS)
--     Owners pick from this during onboarding;
--     selections are copied into their own ingredients table.
-- ─────────────────────────────────────────────
CREATE TABLE ingredient_library (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  price_per_kg numeric NOT NULL,
  unit         text NOT NULL DEFAULT 'kg',
  category     text,
  created_at   timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────
-- 11. ingredient_nutrition  (IFCT reference — no RLS)
--     Per-ingredient nutritional data from FSSAI/IFCT tables.
--     Globally readable; used by the nutrition Edge Function.
-- ─────────────────────────────────────────────
CREATE TABLE ingredient_nutrition (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name text NOT NULL UNIQUE,
  energy_kcal     numeric,
  protein_g       numeric,
  carbs_g         numeric,
  fat_g           numeric,
  fibre_g         numeric,
  sodium_mg       numeric
);


-- ═════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═════════════════════════════════════════════

-- Enable RLS on all 9 core tables
ALTER TABLE restaurants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_data         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tips                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights            ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_imports           ENABLE ROW LEVEL SECURITY;

-- ingredient_library and ingredient_nutrition: NO RLS (globally readable)


-- ── restaurants ──────────────────────────────
CREATE POLICY "owner full access"
  ON restaurants FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());


-- ── ingredients ──────────────────────────────
CREATE POLICY "owner full access"
  ON ingredients FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );


-- ── recipes ──────────────────────────────────
CREATE POLICY "owner full access"
  ON recipes FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );


-- ── recipe_ingredients ────────────────────────
CREATE POLICY "owner full access"
  ON recipe_ingredients FOR ALL
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );


-- ── ingredient_price_history ──────────────────
CREATE POLICY "owner full access"
  ON ingredient_price_history FOR ALL
  USING (
    ingredient_id IN (
      SELECT id FROM ingredients
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    ingredient_id IN (
      SELECT id FROM ingredients
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );


-- ── nutrition_data ────────────────────────────
CREATE POLICY "owner full access"
  ON nutrition_data FOR ALL
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );


-- ── ai_tips ───────────────────────────────────
CREATE POLICY "owner full access"
  ON ai_tips FOR ALL
  USING (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM recipes
      WHERE restaurant_id IN (
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
      )
    )
  );


-- ── ai_insights ───────────────────────────────
CREATE POLICY "owner full access"
  ON ai_insights FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );


-- ── menu_imports ──────────────────────────────
CREATE POLICY "owner full access"
  ON menu_imports FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );
