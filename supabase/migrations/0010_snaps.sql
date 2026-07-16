-- ============================================================
-- 0010_snaps.sql — Snaps: ephemeral view-once photos between friends
-- Run this in the Supabase SQL editor.
-- ============================================================

create table if not exists public.snaps (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  viewed_at timestamptz
);

create index if not exists snaps_recipient_idx
  on public.snaps (recipient_id, created_at desc);
create index if not exists snaps_sender_idx
  on public.snaps (sender_id, created_at desc);

alter table public.snaps enable row level security;

-- Sender may create a snap addressed as themselves.
drop policy if exists "send snaps" on public.snaps;
create policy "send snaps" on public.snaps
  for insert to authenticated
  with check (sender_id = auth.uid());

-- Either party can read the snap row (recipient to view, sender to see status).
drop policy if exists "read own snaps" on public.snaps;
create policy "read own snaps" on public.snaps
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Recipient can mark it viewed.
drop policy if exists "recipient marks viewed" on public.snaps;
create policy "recipient marks viewed" on public.snaps
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Sender (or recipient after viewing) can delete.
drop policy if exists "delete own snaps" on public.snaps;
create policy "delete own snaps" on public.snaps
  for delete to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- Realtime so recipients get new snaps pushed live.
do $$
begin
  begin
    alter publication supabase_realtime add table public.snaps;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------- Storage bucket for snap images ----------
insert into storage.buckets (id, name, public)
values ('snaps', 'snaps', true)
on conflict (id) do nothing;

-- Users upload only into their own folder: snaps/<uid>/<file>
drop policy if exists "snap upload" on storage.objects;
create policy "snap upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'snaps'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "snap read" on storage.objects;
create policy "snap read" on storage.objects
  for select to authenticated
  using (bucket_id = 'snaps');

drop policy if exists "snap delete own" on storage.objects;
create policy "snap delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'snaps'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
