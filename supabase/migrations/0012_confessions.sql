-- ============================================================
-- 0012_confessions.sql — anonymous campus confession feed
-- Run this in the Supabase SQL editor.
-- Author is stored (for moderation) but never surfaced in the UI.
-- ============================================================

create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists confessions_created_idx
  on public.confessions (created_at desc);

alter table public.confessions enable row level security;

-- Anyone signed in can read the feed.
drop policy if exists "read confessions" on public.confessions;
create policy "read confessions" on public.confessions
  for select to authenticated
  using (true);

-- Post as yourself (author hidden client-side).
drop policy if exists "post confession" on public.confessions;
create policy "post confession" on public.confessions
  for insert to authenticated
  with check (author_id = auth.uid());

-- Delete your own confession.
drop policy if exists "delete own confession" on public.confessions;
create policy "delete own confession" on public.confessions
  for delete to authenticated
  using (author_id = auth.uid());

-- Realtime for a live feed.
do $$
begin
  begin
    alter publication supabase_realtime add table public.confessions;
  exception when duplicate_object then null;
  end;
end $$;
