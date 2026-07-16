-- Pulse — Friend Groups: small circles of friends with their own
-- leaderboard, separate from the global friends list.

create table if not exists public.friend_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_emoji text default '👥',
  avatar_image_url text,
  color text default '#6C63FF',
  created_by uuid references auth.users(id) on delete cascade not null,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.friend_groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);

create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_friend_groups_invite on public.friend_groups(invite_code);

alter table public.friend_groups enable row level security;
alter table public.group_members enable row level security;

-- friend_groups policies
create policy "Members can view their groups" on public.friend_groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = friend_groups.id and user_id = auth.uid()
    )
  );

create policy "Admins can update groups" on public.friend_groups
  for update using (
    exists (
      select 1 from public.group_members
      where group_id = friend_groups.id and user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can create groups" on public.friend_groups
  for insert with check (auth.uid() = created_by);

create policy "Admins can delete groups" on public.friend_groups
  for delete using (
    exists (
      select 1 from public.group_members
      where group_id = friend_groups.id and user_id = auth.uid() and role = 'admin'
    )
  );

-- Anyone signed in can look up a group by invite code to preview it before
-- joining (app/groups/join/[inviteCode]/page.tsx) — without this, the
-- "Members can view their groups" policy above would 403 a non-member
-- trying to see what they're about to join.
create policy "Anyone can preview a group via invite code" on public.friend_groups
  for select using (auth.uid() is not null);

-- group_members policies
create policy "Members can view group members" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );

create policy "Admins can manage members" on public.group_members
  for all using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
        and gm2.role = 'admin'
    )
  );

create policy "Users can leave groups" on public.group_members
  for delete using (user_id = auth.uid());

-- Covers BOTH "join via invite link" and "group creator inserts themself
-- as the first admin row" — the latter has no group_members row yet to
-- satisfy "Admins can manage members", so this simpler self-insert policy
-- is what actually makes group creation possible. Multiple permissive
-- policies on the same command OR together, so an admin adding someone
-- else still works via "Admins can manage members" above.
create policy "Users can join via invite" on public.group_members
  for insert with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.group_members;

-- Storage bucket for group avatar photos.
insert into storage.buckets (id, name, public)
values ('group-avatars', 'group-avatars', true)
on conflict (id) do nothing;

-- Path convention: {groupId}/{userId}.jpg — storage.foldername(name) splits
-- "groupId/userId.jpg" into ['groupId', 'userId.jpg'], so foldername(name)[1]
-- is the groupId segment. Anyone who is currently an admin of that group
-- may upload/replace its avatar.
--
-- A SECOND path is allowed too: temp/{userId}/*.jpg. The create-group flow
-- has to upload a photo BEFORE the group row (and therefore any
-- group_members admin row) exists — there's no group to check admin-of
-- yet — so uploads under a user's own temp/ folder are allowed
-- unconditionally, and CreateGroupForm.tsx just stores that path's public
-- URL directly on the new group's avatar_image_url rather than moving the
-- file afterward.
create policy "Group admins can upload avatars" on storage.objects
  for insert with check (
    bucket_id = 'group-avatars'
    and (
      (
        (storage.foldername(name))[1] = 'temp'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or exists (
        select 1 from public.group_members
        where group_id = (storage.foldername(name))[1]::uuid
          and user_id = auth.uid()
          and role = 'admin'
      )
    )
  );

create policy "Group avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'group-avatars');
