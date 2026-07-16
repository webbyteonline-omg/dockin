-- ============================================================
-- 0011_direct_messages.sql — 1:1 chat (DMs) between friends
-- Run this in the Supabase SQL editor.
-- ============================================================

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists dm_pair_idx
  on public.direct_messages (sender_id, recipient_id, created_at desc);
create index if not exists dm_recipient_idx
  on public.direct_messages (recipient_id, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists "send dm" on public.direct_messages;
create policy "send dm" on public.direct_messages
  for insert to authenticated
  with check (sender_id = auth.uid());

drop policy if exists "read own dm" on public.direct_messages;
create policy "read own dm" on public.direct_messages
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Recipient can mark messages read.
drop policy if exists "mark dm read" on public.direct_messages;
create policy "mark dm read" on public.direct_messages
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "delete own dm" on public.direct_messages;
create policy "delete own dm" on public.direct_messages
  for delete to authenticated
  using (sender_id = auth.uid());

-- Realtime for live chat.
do $$
begin
  begin
    alter publication supabase_realtime add table public.direct_messages;
  exception when duplicate_object then null;
  end;
end $$;
