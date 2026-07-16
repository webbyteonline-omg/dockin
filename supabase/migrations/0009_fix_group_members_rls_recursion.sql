-- Fix: infinite recursion in group_members RLS policies.
--
-- "Members can view group members" and "Admins can manage members" (from
-- 0008_friend_groups.sql) each check membership by running a subquery
-- against group_members itself:
--
--   using (exists (select 1 from public.group_members gm2 where ...))
--
-- Postgres has to apply RLS to evaluate that inner SELECT too, which
-- re-triggers the SAME policy, which runs the SAME subquery again, forever
-- — Postgres detects this and errors out, which PostgREST surfaces as a
-- 500. This is exactly the error the app hit:
--   GET .../group_members?select=group_id&user_id=eq.<uid>  -> 500
--
-- Fix: move the "is this user a member/admin of this group" check into a
-- SECURITY DEFINER function. Such a function runs with the privileges of
-- its owner (bypassing RLS internally for its own query), so calling it
-- from inside a policy does NOT re-trigger that policy — breaking the
-- recursion. This is the standard Supabase-recommended pattern for
-- self-referencing table RLS.

create or replace function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id and role = 'admin'
  );
$$;

-- Restrict execute to authenticated users only (not anon/public).
revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.is_group_admin(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_admin(uuid, uuid) to authenticated;

-- Replace the recursive group_members policies to call the functions
-- instead of querying group_members directly.
drop policy if exists "Members can view group members" on public.group_members;
create policy "Members can view group members" on public.group_members
  for select using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Admins can manage members" on public.group_members;
create policy "Admins can manage members" on public.group_members
  for all using (public.is_group_admin(group_id, auth.uid()));

-- The friend_groups policies technically query group_members (a DIFFERENT
-- table than the one being protected), so they were never recursive — but
-- switch them to the same helper functions for consistency and so any
-- future edit to group_members' policies can't silently reintroduce this
-- bug via a copy-paste.
drop policy if exists "Members can view their groups" on public.friend_groups;
create policy "Members can view their groups" on public.friend_groups
  for select using (public.is_group_member(id, auth.uid()));

drop policy if exists "Admins can update groups" on public.friend_groups;
create policy "Admins can update groups" on public.friend_groups
  for update using (public.is_group_admin(id, auth.uid()));

drop policy if exists "Admins can delete groups" on public.friend_groups;
create policy "Admins can delete groups" on public.friend_groups
  for delete using (public.is_group_admin(id, auth.uid()));

-- Same recursion risk existed in the storage upload policy (it queries
-- group_members directly inside a storage.objects policy — not the same
-- table, so not recursive, but switch to the helper for consistency).
drop policy if exists "Group admins can upload avatars" on storage.objects;
create policy "Group admins can upload avatars" on storage.objects
  for insert with check (
    bucket_id = 'group-avatars'
    and (
      (
        (storage.foldername(name))[1] = 'temp'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
      or public.is_group_admin((storage.foldername(name))[1]::uuid, auth.uid())
    )
  );
