-- Pulse v3 — borrow/lend tracker + approximate map location
-- Run after 0002_social.sql.

-- =========================================================
-- Borrow / Lend
-- =========================================================
create table if not exists public.borrow_lend (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  type text check (type in ('borrowed', 'lent')) not null,
  person_name text not null,
  person_user_id uuid references auth.users on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  reason text,
  date date not null default current_date,
  due_date date,
  status text check (status in ('pending', 'settled')) default 'pending' not null,
  settled_at timestamptz,
  notified_overdue boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_borrow_lend_user on public.borrow_lend(user_id, status, created_at desc);
create index if not exists idx_borrow_lend_overdue on public.borrow_lend(due_date)
  where status = 'pending' and notified_overdue = false;

alter table public.borrow_lend enable row level security;
create policy "own" on public.borrow_lend for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Approximate location for the campus map (friend markers).
-- Exact coordinates stay E2E-encrypted in encrypted_coords; these are
-- rounded to ~110m and only visible to friends when privacy_location is on
-- (existing RLS policy on location_shares already gates that).
-- =========================================================
alter table public.location_shares
  add column if not exists approx_lat numeric(6,3),
  add column if not exists approx_lng numeric(6,3);
