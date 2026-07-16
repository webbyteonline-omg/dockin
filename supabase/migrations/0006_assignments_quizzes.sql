-- Pulse — dedicated Assignments + Quizzes tracking
-- academic_events stays a pure calendar/notification table (holiday/exam/quiz/
-- assignment date markers). These two new tables hold the gradable work-item
-- state (status/score) that academic_events was never designed to carry.

-- =========================================================
-- Assignments
-- =========================================================
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'graded', 'late')),
  score numeric(6,2),
  max_score numeric(6,2),
  submitted_at timestamptz,
  created_at timestamptz default now() not null
);

-- =========================================================
-- Quizzes (upcoming + past quiz tracking, distinct from full exams)
-- =========================================================
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  syllabus text,
  date date not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'missed')),
  score numeric(6,2),
  max_score numeric(6,2),
  created_at timestamptz default now() not null
);

-- =========================================================
-- Exams (semester/mid-term/final exams — separate from quick quizzes)
-- =========================================================
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  exam_type text not null default 'other' check (exam_type in ('midterm', 'final', 'unit_test', 'practical', 'other')),
  date date not null,
  syllabus text,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'missed')),
  score numeric(6,2),
  max_score numeric(6,2),
  created_at timestamptz default now() not null
);

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists idx_assignments_user_due on public.assignments(user_id, due_date);
create index if not exists idx_assignments_subject on public.assignments(subject_id);
create index if not exists idx_quizzes_user_date on public.quizzes(user_id, date);
create index if not exists idx_quizzes_subject on public.quizzes(subject_id);
create index if not exists idx_exams_user_date on public.exams(user_id, date);
create index if not exists idx_exams_subject on public.exams(subject_id);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.assignments enable row level security;
alter table public.quizzes enable row level security;
alter table public.exams enable row level security;

create policy "own" on public.assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on public.quizzes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own" on public.exams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
