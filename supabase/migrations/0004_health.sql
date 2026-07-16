-- Pulse v4 — health tracking on daily check-ins
alter table public.daily_checkins
  add column if not exists water_ml integer check (water_ml >= 0 and water_ml <= 20000),
  add column if not exists calories integer check (calories >= 0 and calories <= 20000),
  add column if not exists sleep_minutes integer check (sleep_minutes >= 0 and sleep_minutes <= 1440),
  add column if not exists journal text;
