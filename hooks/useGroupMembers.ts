"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { PROFILE_COLUMNS } from "@/lib/supabase/columns";
import { logActivity } from "@/lib/activityLog";
import { groupKeys } from "./useGroups";
import { useAuthStore } from "@/store/authStore";
import type { GroupMemberRole, UserProfile } from "@/lib/supabase/types";

export const groupMemberKeys = {
  list: (groupId: string) => ["group-members", groupId] as const,
};

export interface GroupMemberWithProfile {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
  profile: UserProfile | null;
}

/** All members of a group, joined with their profile (two-step fetch —
 * matches useFriends/useFriendRequests' established pattern). */
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: groupId ? groupMemberKeys.list(groupId) : ["group-members", "none"],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMemberWithProfile[]> => {
      const supabase = getSupabaseBrowser();
      const { data: members, error } = await supabase
        .from("group_members")
        .select("id,group_id,user_id,role,joined_at")
        .eq("group_id", groupId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      if (!members || members.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("user_profiles")
        .select(PROFILE_COLUMNS)
        .in(
          "id",
          members.map((m) => m.user_id)
        );
      if (pErr) throw pErr;
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return members.map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }));
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: userId, role: "member" as const });
      if (error) throw error;
      logActivity("group_member_added", "group", { entityId: groupId });
    },
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupMemberKeys.list(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.mine });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
      logActivity("group_member_removed", "group", { entityId: groupId });
    },
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupMemberKeys.list(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.mine });
    },
  });
}

export function useMakeAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase
        .from("group_members")
        .update({ role: "admin" as const })
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
      logActivity("group_member_role_changed", "group", { entityId: groupId });
    },
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: groupMemberKeys.list(groupId) });
    },
  });
}

/** Leave a group — blocked client-side if you're the only admin, since
 * that would strand the group with no one able to manage it. */
export function useLeaveGroup() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error("Not signed in");
      const supabase = getSupabaseBrowser();

      const { data: members, error: mErr } = await supabase
        .from("group_members")
        .select("user_id,role")
        .eq("group_id", groupId);
      if (mErr) throw mErr;

      const admins = (members ?? []).filter((m) => m.role === "admin");
      const iAmOnlyAdmin = admins.length === 1 && admins[0]?.user_id === user.id;
      if (iAmOnlyAdmin && (members ?? []).length > 1) {
        throw new Error(
          "You're the only admin — make someone else admin before leaving, or delete the group."
        );
      }

      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);
      if (error) throw error;
      logActivity("group_left", "group", { entityId: groupId });
    },
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: groupMemberKeys.list(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.mine });
    },
  });
}
