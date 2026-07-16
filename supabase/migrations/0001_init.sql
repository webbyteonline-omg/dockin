-- Pulse — initial schema
-- Run in the Supabase SQL editor or via `supabase db push`.

-- =========================================================
-- Subjects / Attendance
-- =========================================================
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text default '#6C63FF',
  total_classes integer default 0 not null check (total_classes >= 0),
  attended_classes integer default 0 not null check (attended_classes >= 0),
  required_percentage integer default 75 not null check (required_percentage between 1 and 100),
  created_at timestamptz default now() not null,
  constraint attended_lte_total check (attended_classes <= total_classes)
);

-- Per-day attendance log (powers the monthly calendar view)
create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  date date not null default (now() at time zone 'Asia/Kolkata')::date,
  status text not null check (status in ('present', 'absent')),
  created_at timestamptz default now() not null
);

-- =========================================================
-- Academic Events
-- =========================================================
create table if not exists public.academic_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  event_type text check (event_type in ('holiday', 'exam', 'quiz', 'assignment', 'other')),
  date date not null,
  description text,
  subject_id uuid references public.subjects(id) on delete set null,
  notified_3day boolean default false not null,
  notified_1day boolean default false not null,
  created_at timestamptz default now() not null
);

-- =========================================================
-- Expenses
-- =========================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(10,2) not null check (amount > 0),
  merchant text,
  category text check (category in ('food','travel','shopping','bills','education','health','entertainment','others')),
  note text,
  date date not null,
  source text check (source in ('manual','sms','screenshot')),
  created_at timestamptz default now() not null
);

-- =========================================================
-- Monthly Budgets
-- =========================================================
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2020 and 2100),
  category text not null,
  amount numeric(10,2) not null check (amount >= 0),
  unique(user_id, month, year, category)
);

-- =========================================================
-- Push notification subscriptions
-- =========================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  subscription jsonb not null,
  created_at timestamptz default now() not null,
  unique(user_id, subscription)
);

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists idx_subjects_user on public.subjects(user_id);
create index if not exists idx_attendance_logs_user_date on public.attendance_logs(user_id, date);
create index if not exists idx_attendance_logs_subject on public.attendance_logs(subject_id, date);
create index if not exists idx_events_user_date on public.academic_events(user_id, date);
create index if not exists idx_events_notify on public.academic_events(date) where notified_3day = false or notified_1day = false;
create index if not exists idx_expenses_user_date on public.expenses(user_id, date desc);
create index if not exists idx_budgets_user_period on public.budgets(user_id, year, month);
create index if not exists idx_push_subs_user on public.push_subscriptions(user_id);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.subjects enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.academic_events enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on public.attendance_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on public.academic_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
