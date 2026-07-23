-- KitchenIQ — KB Support Tables
-- Migration: 002_kb_support_tables.sql
--
-- Creates two tables needed by the agmarknet-sync Edge Function:
--   1. kb_alerts   — global KB-level price spike log (not restaurant-specific)
--   2. kb_sync_log — audit log of every agmarknet-sync cron run per ingredient
--
-- Neither table has RLS. Both are written to only by the agmarknet-sync Edge
-- Function using the service role key. They are never written to by the frontend.
--
-- Run this migration AFTER 001_initial_schema.sql and the KB migration.

begin;


-- =============================================================================
-- 1. kb_alerts
-- Global price spike log. Triggered by agmarknet-sync when a KB ingredient
-- price changes by ≥15% between consecutive cron runs.
-- Not restaurant-specific — one alert per commodity per city per spike event.
-- =============================================================================

create table if not exists kb_alerts (
  id                uuid primary key default gen_random_uuid(),
  kb_ingredient_id  uuid not null references kb_ingredients(id) on delete cascade,
  city              text not null default 'pune',
  previous_price    numeric(10,2) not null,
  new_price         numeric(10,2) not null,
  change_pct        integer not null,          -- absolute percentage change, e.g. 22 means 22%
  triggered_at      timestamptz not null default now()
);

create index if not exists idx_kb_alerts_ingredient
  on kb_alerts (kb_ingredient_id, triggered_at desc);

comment on table kb_alerts is
  'Global KB-level price spike log. Written by agmarknet-sync when a commodity '
  'price changes ≥15% between consecutive cron runs. One row per spike event. '
  'Not restaurant-specific. Read by dashboard to surface "ingredient price spike" alerts.';

comment on column kb_alerts.change_pct is
  'Absolute percentage change rounded to nearest integer. '
  'E.g. 22 means price moved 22% (could be up or down — compare previous vs new to determine direction).';


-- =============================================================================
-- 2. kb_sync_log
-- Per-ingredient audit log of every agmarknet-sync cron run.
-- One row inserted per ingredient per run, regardless of outcome.
-- Used for monitoring cron health and debugging missing price updates.
-- =============================================================================

create table if not exists kb_sync_log (
  id                uuid primary key default gen_random_uuid(),
  kb_ingredient_id  uuid references kb_ingredients(id) on delete cascade,
  city              text not null default 'pune',
  status            text not null
    check (status in ('success', 'no_data', 'error')),
  recorded_at       timestamptz not null default now()
);

create index if not exists idx_kb_sync_log_lookup
  on kb_sync_log (kb_ingredient_id, recorded_at desc);

comment on table kb_sync_log is
  'Audit log of every agmarknet-sync cron run. '
  'status values: success = price fetched and stored; '
  'no_data = Agmarknet returned no records for this commodity today (normal); '
  'error = API or DB failure. '
  'A healthy run has ~30 success rows and some no_data rows. Zero error rows expected.';


commit;
