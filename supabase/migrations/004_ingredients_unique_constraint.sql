-- Migration 004: deduplicate ingredients + add unique constraint
-- Run in Supabase Dashboard → SQL Editor
--
-- Some duplicate ingredient rows are referenced by recipe_ingredients,
-- so we must remap those FKs to the surviving row before deleting duplicates.

-- Step 1: remap recipe_ingredients FKs from every duplicate ("loser") to the
--         row we're keeping ("winner" = most recently updated, tie-break on id)
WITH winners AS (
  SELECT DISTINCT ON (restaurant_id, name)
    id   AS winner_id,
    restaurant_id,
    name
  FROM ingredients
  ORDER BY restaurant_id, name, last_updated DESC, id ASC
),
losers AS (
  SELECT i.id AS loser_id, w.winner_id
  FROM   ingredients i
  JOIN   winners w ON w.restaurant_id = i.restaurant_id AND w.name = i.name
  WHERE  i.id <> w.winner_id
)
UPDATE recipe_ingredients ri
SET    ingredient_id = l.winner_id
FROM   losers l
WHERE  ri.ingredient_id = l.loser_id;

-- Step 2: now safe to delete the losers — no FK references remain
DELETE FROM ingredients
WHERE id NOT IN (
  SELECT DISTINCT ON (restaurant_id, name)
    id
  FROM ingredients
  ORDER BY restaurant_id, name, last_updated DESC, id ASC
);

-- Step 3: prevent future duplicates
ALTER TABLE ingredients
  ADD CONSTRAINT ingredients_restaurant_name_unique
  UNIQUE (restaurant_id, name);
