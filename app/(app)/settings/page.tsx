"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Check, LogOut, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { useMyProfile, useUpdateProfile } from "@/hooks/useProfile";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, type NotificationPrefs } from "@/store/settingsStore";
import { cn } from "@/lib/utils";

const NOTIFICATION_ITEMS: Array<{ key: keyof NotificationPrefs; label: string }> = [
  { key: "friendActivity", label: "Friend activity & requests" },
  { key: "examReminders", label: "Exam & event reminders" },
];

const THEMES = [
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-3 mt-7 first:mt-0">{children}</h2>;
}

export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const displayName = useAuthStore((s) => s.displayName());
  const setUser = useAuthStore((s) => s.setUser);

  const settings = useSettingsStore();
  const profileQuery = useMyProfile();
  const updateProfile = useUpdateProfile();
  const profile = profileQuery.data;

  const [name, setName] = useState(displayName);
  const [nameSaved, setNameSaved] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const saveName = async () => {
    if (!name.trim() || name.trim() === displayName) return;
    setSavingName(true);
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    if (!error && data.user) {
      setUser(data.user);
      updateProfile.mutate({ display_name: name.trim() });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    }
    setSavingName(false);
  };

  const logout = async () => {
    await getSupabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't delete account");
      }
      await getSupabaseBrowser().auth.signOut();
      router.replace("/signup");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg px-5">
      <div className="pt-safe flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink -ml-1.5">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
      </div>
      <h1 className="font-display font-extrabold text-2xl text-ink mt-2">Settings</h1>

      <SectionTitle>Theme</SectionTitle>
      <div className="flex gap-2.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => settings.setTheme(t.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-btn py-3 text-sm font-bold border-[1.5px]",
              settings.theme === t.id ? "dockin-gradient text-white border-transparent" : "bg-white text-ink border-line/[0.08]"
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <SectionTitle>Profile</SectionTitle>
      <div className="flat-card rounded-card p-4 flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button
            variant="secondary"
            onClick={saveName}
            loading={savingName}
            disabled={!name.trim() || name.trim() === displayName}
            className="h-11"
          >
            {nameSaved ? <Check className="h-4 w-4 text-success" /> : "Save"}
          </Button>
        </div>
        <Input label="Username" value={profile ? `@${profile.username}` : "…"} readOnly disabled />
        <Input label="Email" value={user?.email ?? ""} readOnly disabled />
      </div>

      <SectionTitle>Notifications</SectionTitle>
      <div className="flat-card rounded-card p-4 flex flex-col gap-4">
        {NOTIFICATION_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">{item.label}</span>
            <Toggle
              checked={settings.notifications[item.key]}
              onChange={(v) => settings.setNotificationPref(item.key, v)}
              label={item.label}
            />
          </div>
        ))}
      </div>

      <SectionTitle>Account</SectionTitle>
      <div className="flat-card rounded-card overflow-hidden">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-ink border-b-[1.5px] border-line/[0.08]"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-danger"
        >
          <Trash2 className="w-4 h-4" /> Delete account
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-5 pb-8 sm:pb-0">
          <div className="w-full sm:max-w-sm flat-card rounded-card p-5">
            <h3 className="font-bold text-ink">Delete your account?</h3>
            <p className="text-sm text-ink-dim mt-1.5">
              This is permanent — all your snaps, chats, and data will be gone. Type <b>DELETE</b> to confirm.
            </p>
            <Input
              className="mt-3"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
            />
            {deleteError && <p className="text-xs text-danger mt-2">{deleteError}</p>}
            <div className="flex gap-2.5 mt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={deleteText !== "DELETE"}
                loading={deleting}
                onClick={deleteAccount}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="h-10" />
    </div>
  );
}
