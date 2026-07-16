"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activityLog";
import { useAuthStore } from "@/store/authStore";
import type { FriendGroup, GroupMemberRole } from "@/lib/supabase/types";

export const groupKeys = {
  mine: ["groups"] as const,
  detail: (id: string) => ["groups", id] as const,
};

const GROUP_COLUMNS =
  "id,name,avatar_emoji,avatar_image_url,color,created_by,invite_code,created_at,updated_at";

export interface GroupWithMemberCount extends FriendGroup {
  memberCount: number;
}

/** Groups the current user is a member of, with member counts. */
export function useMyGroups() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: groupKeys.mine,
    enabled: !!user,
    queryFn: async (): Promise<GroupWithMemberCount[]> => {
      const supabase = getSupabaseBrowser();
      const { data: memberships, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      const groupIds = memberships.map((m) => m.group_id);
      if (groupIds.length === 0) return [];

      const [{ data: groups, error: gErr }, { data: allMembers, error: mErr }] = await Promise.all([
        supabase.from("friend_groups").select(GROUP_COLUMNS).in("id", groupIds),
        supabase.from("group_members").select("group_id").in("group_id", groupIds),
      ]);
      if (gErr) throw gErr;
      if (mErr) throw mErr;

      const counts = new Map<string, number>();
      for (const m of allMembers ?? []) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);

      return (groups ?? [])
        .map((g) => ({ ...g, memberCount: counts.get(g.id) ?? 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

/** A single group's details + the current user's role in it. */
export function useGroupById(groupId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: groupId ? groupKeys.detail(groupId) : ["groups", "none"],
    enabled: !!user && !!groupId,
    queryFn: async (): Promise<{ group: FriendGroup; myRole: GroupMemberRole | null }> => {
      const supabase = getSupabaseBrowser();
      const [{ data: group, error: gErr }, { data: membership, error: mErr }] = await Promise.all([
        supabase.from("friend_groups").select(GROUP_COLUMNS).eq("id", groupId!).single(),
        supabase
          .from("group_members")
          .select("role")
          .eq("group_id", groupId!)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);
      if (gErr) throw gErr;
      if (mErr) throw mErr;
      return { group, myRole: membership?.role ?? null };
    },
  });
}

export interface CreateGroupInput {
  name: string;
  avatarEmoji: string;
  avatarImageUrl: string | null;
  color: string;
  memberIds: string[]; // friend ids to add alongside the creator
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: CreateGroupInput) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();

      const { data: group, error } = await supabase
        .from("friend_groups")
        .insert({
          name: input.name,
          avatar_emoji: input.avatarEmoji,
          avatar_image_url: input.avatarImageUrl,
          color: input.color,
          created_by: user.id,
        })
        .select(GROUP_COLUMNS)
        .single();
      if (error) throw error;

      const memberRows = [
        { group_id: group.id, user_id: user.id, role: "admin" as const },
        ...input.memberIds.map((id) => ({ group_id: group.id, user_id: id, role: "member" as const })),
      ];
      const { error: mErr } = await supabase.from("group_members").insert(memberRows);
      if (mErr) throw mErr;

      logActivity("group_created", "group", { entityId: group.id, newValue: { name: input.name } });
      return group as FriendGroup;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.mine }),
  });
}

export interface UpdateGroupInput {
  groupId: string;
  name?: string;
  avatarEmoji?: string;
  avatarImageUrl?: string | null;
  color?: string;
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, ...patch }: UpdateGroupInput) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("friend_groups")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.avatarEmoji !== undefined && { avatar_emoji: patch.avatarEmoji }),
          ...(patch.avatarImageUrl !== undefined && { avatar_image_url: patch.avatarImageUrl }),
          ...(patch.color !== undefined && { color: patch.color }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.mine });
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("friend_groups").delete().eq("id", groupId);
      if (error) throw error;
      logActivity("group_deleted", "group", { entityId: groupId });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.mine }),
  });
}

/** Look up a group by its invite code — used by the join-via-link page. */
export function useGroupByInviteCode(inviteCode: string | undefined) {
  return useQuery({
    queryKey: ["groups", "invite", inviteCode],
    enabled: !!inviteCode,
    queryFn: async (): Promise<(FriendGroup & { memberCount: number }) | null> => {
      const supabase = getSupabaseBrowser();
      const { data: group, error } = await supabase
        .from("friend_groups")
        .select(GROUP_COLUMNS)
        .eq("invite_code", inviteCode!)
        .maybeSingle();
      if (error) throw error;
      if (!group) return null;

      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id);

      return { ...group, memberCount: count ?? 0 };
    },
  });
}

export function useJoinGroupByInviteCode() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: user.id, role: "member" as const })
        .select()
        .single();
      // Unique constraint violation (already a member) — treat as success,
      // matches the spec's `ON CONFLICT DO NOTHING` intent.
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.mine });
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}
