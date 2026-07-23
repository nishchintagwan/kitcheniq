-- Migration 004: deduplicate ingredients + add unique constraint
-- Run in Supabase Dashboard → SQL Editor

-- Step 1: remove duplicates, keeping the row with the most recent last_updated
-- (if two rows have the same last_updated, keep the one with the smaller id)
DELETE FROM ingredients
WHERE id NOT IN (
  SELECT DISTINCT ON (restaurant_id, name)
    id
  FROM ingredients
  ORDER BY restaurant_id, name, last_updated DESC, id ASC
);

-- Step 2: prevent future duplicates
ALTER TABLE ingredients
  ADD CONSTRAINT ingredients_restaurant_name_unique
  UNIQUE (restaurant_id, name);
