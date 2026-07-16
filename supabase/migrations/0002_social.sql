-- Pulse v2 — social, timetable, stats, activity, rate limiting
-- Run after 0001_init.sql.

-- =========================================================
-- User profiles (auto-created on signup via trigger)
-- =========================================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  pulse_score integer default 0 not null,
  privacy_steps boolean default true not null,
  privacy_location boolean default false not null,
  privacy_attendance boolean default true not null,
  privacy_finance boolean default false not null,
  privacy_friends_only boolean default false not null,
  onboarded boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_profiles_username on public.user_profiles (lower(username));

-- Auto-create profile on signup (username from metadata, else generated)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user'), '[^a-z0-9_]', '', 'g'));
  if length(base) < 3 then base := 'user' || substr(replace(new.id::text, '-', ''), 1, 6); end if;
  candidate := base;
  while exists (select 1 from public.user_profiles where lower(username) = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.user_profiles (id, username, display_name)
  values (new.id, candidate, coalesce(new.raw_user_meta_data->>'name', candidate));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing users
insert into public.user_profiles (id, username, display_name)
select u.id,
       lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g')) || substr(replace(u.id::text, '-', ''), 1, 4),
       coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.user_profiles p where p.id = u.id);

-- =========================================================
-- Friends
-- =========================================================
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users on delete cascade not null,
  receiver_id uuid references auth.users on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  created_at timestamptz default now() not null,
  unique(sender_id, receiver_id),
  constraint no_self_request check (sender_id <> receiver_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  friend_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, friend_id)
);

create index if not exists idx_friendships_user on public.friendships(user_id);
create index if not exists idx_requests_receiver on public.friend_requests(receiver_id, status);

-- Friendship helper used by several policies
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships where user_id = a and friend_id = b);
$$;

-- Accepting a request atomically creates both friendship rows
create or replace function public.accept_friend_request(request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare req record;
begin
  select * into req from public.friend_requests where id = request_id and receiver_id = auth.uid() and status = 'pending';
  if req is null then raise exception 'request_not_found'; end if;
  update public.friend_requests set status = 'accepted' where id = request_id;
  insert into public.friendships (user_id, friend_id) values (req.sender_id, req.receiver_id) on conflict do nothing;
  insert into public.friendships (user_id, friend_id) values (req.receiver_id, req.sender_id) on conflict do nothing;
end $$;

-- Unfriend removes both directions
create or replace function public.unfriend(other uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.friendships where (user_id = auth.uid() and friend_id = other) or (user_id = other and friend_id = auth.uid());
  delete from public.friend_requests where (sender_id = auth.uid() and receiver_id = other) or (sender_id = other and receiver_id = auth.uid());
end $$;

-- =========================================================
-- Polls
-- =========================================================
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users on delete cascade not null,
  question text not null check (char_length(question) between 1 and 200),
  options jsonb not null,
  votes jsonb default '{}' not null,
  anonymous boolean default false not null,
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz default now() not null,
  unique(poll_id, user_id)
);

create index if not exists idx_polls_creator on public.polls(creator_id, created_at desc);
create index if not exists idx_poll_votes_poll on public.poll_votes(poll_id);

-- Keep polls.votes (option_index -> count) in sync via trigger
create or replace function public.tally_poll_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from public.polls where id = new.poll_id;
  if p is null then raise exception 'poll_not_found'; end if;
  if p.expires_at is not null and p.expires_at < now() then raise exception 'poll_expired'; end if;
  if new.option_index >= jsonb_array_length(p.options) then raise exception 'invalid_option'; end if;
  update public.polls
    set votes = jsonb_set(votes, array[new.option_index::text],
      to_jsonb(coalesce((votes->>new.option_index::text)::int, 0) + 1))
    where id = new.poll_id;
  return new;
end $$;

drop trigger if exists on_poll_vote on public.poll_votes;
create trigger on_poll_vote before insert on public.poll_votes
  for each row execute function public.tally_poll_vote();

-- =========================================================
-- Activity log (immutable audit trail)
-- =========================================================
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz default now() not null
);
create index if not exists idx_activity_user on public.activity_logs(user_id, created_at desc);

-- =========================================================
-- Timetable
-- =========================================================
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  day_of_week integer check (day_of_week between 0 and 6) not null,
  start_time time not null,
  end_time time not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  room text,
  created_at timestamptz default now() not null,
  constraint valid_range check (start_time < end_time)
);
create index if not exists idx_timetable_user on public.timetable_slots(user_id, day_of_week);

-- =========================================================
-- Daily check-ins (mood 1-5 + steps) and aggregated stats
-- =========================================================
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  mood integer check (mood between 1 and 5),
  steps integer check (steps >= 0 and steps <= 200000),
  created_at timestamptz default now() not null,
  unique(user_id, date)
);
create index if not exists idx_checkins_user_date on public.daily_checkins(user_id, date desc);

-- One row per user; friends read it for the leaderboard
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users on delete cascade,
  steps_week integer default 0 not null,
  mood_avg_week numeric(3,2),
  attendance_pct numeric(5,2),
  budget_remaining_pct numeric(5,2),
  pulse_score integer default 0 not null,
  streak integer default 0 not null,
  last_open date,
  week_start date,
  updated_at timestamptz default now() not null
);

-- Daily pulse score history
create table if not exists public.pulse_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  score integer not null check (score between 0 and 100),
  breakdown jsonb,
  unique(user_id, date)
);
create index if not exists idx_pulse_scores_user on public.pulse_scores(user_id, date desc);

-- Weekly leaderboard champions (written at Monday reset)
create table if not exists public.leaderboard_history (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  category text not null,
  user_id uuid references auth.users on delete cascade not null,
  value numeric,
  unique(week_start, category, user_id)
);

-- =========================================================
-- Location sharing (coords E2E-encrypted client-side)
-- =========================================================
create table if not exists public.location_shares (
  user_id uuid primary key references auth.users on delete cascade,
  area text check (area in ('campus', 'outside')),
  encrypted_coords text,
  updated_at timestamptz default now() not null
);

-- =========================================================
-- Rate limiting (DB-enforced, works no matter the client)
-- =========================================================
create table if not exists public.rate_limits (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  count integer default 0 not null,
  primary key (user_id, action, window_start)
);

create or replace function public.check_rate_limit(p_action text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = public as $$
declare
  w_start timestamptz := date_trunc('day', now());
  current int;
begin
  if p_window < interval '1 day' then
    w_start := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
  end if;
  insert into public.rate_limits (user_id, action, window_start, count)
  values (auth.uid(), p_action, w_start, 1)
  on conflict (user_id, action, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into current;
  if current > p_max then
    insert into public.activity_logs (user_id, action, entity_type, new_value)
    values (auth.uid(), 'rate_limit_hit', p_action, jsonb_build_object('count', current));
    raise exception 'rate_limit:%', p_action;
  end if;
end $$;

create or replace function public.rl_polls() returns trigger language plpgsql security definer as $$
begin perform public.check_rate_limit('polls', 5, interval '1 day'); return new; end $$;
create or replace function public.rl_friend_requests() returns trigger language plpgsql security definer as $$
begin perform public.check_rate_limit('friend_requests', 20, interval '1 day'); return new; end $$;
create or replace function public.rl_expenses() returns trigger language plpgsql security definer as $$
begin perform public.check_rate_limit('expenses', 50, interval '1 day'); return new; end $$;
create or replace function public.rl_location() returns trigger language plpgsql security definer as $$
begin perform public.check_rate_limit('location', 1, interval '30 seconds'); return new; end $$;

drop trigger if exists rl_polls_t on public.polls;
create trigger rl_polls_t before insert on public.polls for each row execute function public.rl_polls();
drop trigger if exists rl_friend_requests_t on public.friend_requests;
create trigger rl_friend_requests_t before insert on public.friend_requests for each row execute function public.rl_friend_requests();
drop trigger if exists rl_expenses_t on public.expenses;
create trigger rl_expenses_t before insert on public.expenses for each row execute function public.rl_expenses();
drop trigger if exists rl_location_t on public.location_shares;
create trigger rl_location_t before insert or update on public.location_shares for each row execute function public.rl_location();

-- Old windows cleanup (called from daily cron)
create or replace function public.cleanup_rate_limits()
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_start < now() - interval '2 days';
$$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.user_profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.user_stats enable row level security;
alter table public.pulse_scores enable row level security;
alter table public.leaderboard_history enable row level security;
alter table public.location_shares enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles: readable (needed for username search; respect privacy_friends_only)
create policy "read" on public.user_profiles for select
  using (
    id = auth.uid()
    or privacy_friends_only = false
    or public.are_friends(auth.uid(), id)
  );
create policy "own insert" on public.user_profiles for insert with check (auth.uid() = id);
create policy "own update" on public.user_profiles for update using (auth.uid() = id);

-- Friend requests: sender or receiver
create policy "involved" on public.friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "send own" on public.friend_requests for insert with check (auth.uid() = sender_id);
create policy "receiver decides" on public.friend_requests for update
  using (auth.uid() = receiver_id or auth.uid() = sender_id);
create policy "sender cancels" on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Friendships: rows are created via accept_friend_request (security definer)
create policy "involved" on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "involved delete" on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Polls: creator + their friends can see (spec fix — original policy hid polls from friends)
create policy "creator or friends" on public.polls for select
  using (auth.uid() = creator_id or public.are_friends(auth.uid(), creator_id));
create policy "create own" on public.polls for insert with check (auth.uid() = creator_id);
create policy "creator manages" on public.polls for update using (auth.uid() = creator_id);
create policy "creator deletes" on public.polls for delete using (auth.uid() = creator_id);

-- Poll votes: vote once on visible polls; results visible to poll viewers
create policy "view votes" on public.poll_votes for select
  using (exists (
    select 1 from public.polls p where p.id = poll_id
      and (p.creator_id = auth.uid() or public.are_friends(auth.uid(), p.creator_id))
  ));
create policy "vote own" on public.poll_votes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.polls p where p.id = poll_id
        and (p.creator_id = auth.uid() or public.are_friends(auth.uid(), p.creator_id))
    )
  );

-- Activity logs: insert + read own only. No update/delete → immutable audit trail.
create policy "own read" on public.activity_logs for select using (auth.uid() = user_id);
create policy "own insert" on public.activity_logs for insert with check (auth.uid() = user_id);

-- Timetable: own
create policy "own" on public.timetable_slots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Check-ins: own full access; friends read when steps sharing is on
create policy "own" on public.daily_checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "friends read" on public.daily_checkins for select
  using (
    public.are_friends(auth.uid(), user_id)
    and exists (select 1 from public.user_profiles p where p.id = user_id and p.privacy_steps)
  );

-- Stats: own full access; friends read (per-field privacy applied in UI + score policy below)
create policy "own" on public.user_stats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "friends read" on public.user_stats for select
  using (public.are_friends(auth.uid(), user_id));

-- Pulse score history: own + friends
create policy "own" on public.pulse_scores for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "friends read" on public.pulse_scores for select
  using (public.are_friends(auth.uid(), user_id));

-- Leaderboard history: any authenticated user can read; written by service role
create policy "read" on public.leaderboard_history for select using (auth.uid() is not null);

-- Location: own full access; friends read only when sharing enabled
create policy "own" on public.location_shares for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "friends read" on public.location_shares for select
  using (
    public.are_friends(auth.uid(), user_id)
    and exists (select 1 from public.user_profiles p where p.id = user_id and p.privacy_location)
  );

-- Rate limits: no direct client access (functions are security definer)

-- =========================================================
-- Realtime
-- =========================================================
alter publication supabase_realtime add table public.polls;
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.user_stats;
alter publication supabase_realtime add table public.user_profiles;
