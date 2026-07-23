-- Migration 003: kb-matcher webhook trigger + agmarknet-sync cron
-- Run in Supabase Dashboard → SQL Editor

-- ── Extensions ──────────────────────────────────────────────────────────────
-- pg_net: async HTTP from database triggers
-- pg_cron: scheduled jobs (usually pre-enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 1. kb-matcher webhook trigger ───────────────────────────────────────────
-- Fires AFTER every INSERT on ingredients.
-- Calls kb-matcher Edge Function which fuzzy-matches the ingredient name
-- against kb_ingredients and writes back kb_ingredient_id if found.
-- Fire-and-forget via pg_net (non-blocking — never delays the INSERT).

CREATE OR REPLACE FUNCTION trigger_kb_matcher()
RETURNS trigger AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://yecxmxlmnwnmmflchbxn.supabase.co/functions/v1/kb-matcher',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer sb_publishable_66oKmxnd0qDgnlevjRQqsA_q-zbouPe'
    ),
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'ingredients',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ingredient_insert ON ingredients;

CREATE TRIGGER on_ingredient_insert
  AFTER INSERT ON ingredients
  FOR EACH ROW EXECUTE FUNCTION trigger_kb_matcher();

-- ── 2. agmarknet-sync daily cron ────────────────────────────────────────────
-- Runs daily at 00:30 UTC (06:00 IST).
-- Fetches live mandi prices from Agmarknet API, upserts kb_ingredient_prices,
-- appends kb_ingredient_price_history, and raises kb_alerts on ≥15% spikes.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agmarknet-sync-daily') THEN
    PERFORM cron.unschedule('agmarknet-sync-daily');
  END IF;
END;
$$;

SELECT cron.schedule(
  'agmarknet-sync-daily',
  '30 0 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://yecxmxlmnwnmmflchbxn.supabase.co/functions/v1/agmarknet-sync',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer sb_publishable_66oKmxnd0qDgnlevjRQqsA_q-zbouPe'
    ),
    body    := '{}'::jsonb
  )
  $$
);

-- Verify cron was registered
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'agmarknet-sync-daily';
