"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/components/auth/AuthField";
import { useMyProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/store/authStore";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function EditProfilePage() {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.displayName());
  const setUser = useAuthStore((s) => s.setUser);
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(profile?.display_name ?? displayName);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data, error } = await getSupabaseBrowser().auth.updateUser({ data: { name: name.trim() } });
    if (!error && data.user) setUser(data.user);
    await updateProfile.mutateAsync({ display_name: name.trim() });
    setSaving(false);
    router.back();
  };

  return (
    <div className="min-h-dvh bg-white px-5">
      <div className="pt-safe flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink -ml-1.5">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
      </div>
      <h1 className="font-display font-extrabold text-2xl text-ink mt-2 mb-6">Edit profile</h1>

      <AuthField label="Name" value={name} onChange={(e) => setName(e.target.value)} />

      <Button size="lg" className="w-full mt-6" loading={saving} onClick={save}>
        Save
      </Button>
    </div>
  );
}
