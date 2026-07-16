-- Pulse — live friend-location sharing for the Friends page map.
--
-- This is intentionally a SEPARATE table from `location_shares`
-- (0002_social.sql), which already powers the campus-map "on campus /
-- off campus" area indicator with rounded/approximate coordinates and
-- client-side encryption. `user_locations` instead stores exact
-- lat/lng for the Friends-page live map (pins on satellite imagery),
-- gated by an explicit per-user `is_sharing` flag the user toggles
-- themselves. The two systems run independently; a user can have rows
-- in one, both, or neither.

create table if not exists public.user_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  latitude double precision not null,
  longitude double precision not null,
  is_sharing boolean not null default false,
  last_updated timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_locations enable row level security;

-- Users can read locations of their friends only (or their own row).
create policy "Read friend locations" on public.user_locations
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships
      where (user_id = auth.uid() and friend_id = user_locations.user_id)
         or (friend_id = auth.uid() and user_id = user_locations.user_id)
    )
  );

-- Users can only write their own location row.
create policy "Update own location" on public.user_locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_user_locations_sharing
  on public.user_locations(user_id) where is_sharing = true;

alter publication supabase_realtime add table public.user_locations;
