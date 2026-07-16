"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/components/auth/AuthField";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { useUpdateProfile } from "@/hooks/useProfile";

const AVATARS = [
  "/dockin/avatar-sachin.png",
  "/dockin/avatar-ananya.png",
  "/dockin/avatar-rohit.png",
  "/dockin/avatar-priya.png",
];

const BATCHES = ["CS · Batch 2027", "ECE · Batch 2027", "Mech · Batch 2026"];
const HOSTELS = ["Hostel A", "Hostel B", "Hostel C", "Hostel D"];

export default function AvatarSetupPage() {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.displayName());
  const updateProfile = useUpdateProfile();

  const [avatar, setAvatar] = useState(0);
  const [name, setName] = useState(displayName);
  const [batch, setBatch] = useState<number | null>(0);
  const [hostel, setHostel] = useState<number | null>(3);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        avatar_url: AVATARS[avatar],
        display_name: name.trim() || displayName,
      });
      void getSupabaseBrowser().auth.updateUser({
        data: {
          batch: batch !== null ? BATCHES[batch] : undefined,
          hostel: hostel !== null ? HOSTELS[hostel] : undefined,
        },
      });
    } catch {
      // Non-blocking — profile can be completed later in Settings.
    }
    router.replace("/onboarding");
    router.refresh();
  };

  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-[26px] pt-safe pb-10">
        {/* Step progress: 2 of 3 */}
        <div className="flex gap-1.5 mt-6">
          <span className="h-[5px] flex-1 rounded-full dockin-gradient-h" />
          <span className="h-[5px] flex-1 rounded-full dockin-gradient-h" />
          <span className="h-[5px] flex-1 rounded-full bg-line/10" />
        </div>

        <h1 className="font-display font-extrabold text-[27px] text-ink mt-6">Show your face.</h1>
        <p className="text-[15px] text-ink-dim mt-1.5">Friends recognize snaps, not usernames.</p>

        {/* Avatar upload circle */}
        <div className="relative flex justify-center mt-8">
          <div className="absolute -top-1.5 left-[calc(50%+62px)] text-[22px] text-primary rotate-[15deg]">✦</div>
          <div className="absolute bottom-0.5 left-[calc(50%-92px)] text-base text-secondary -rotate-[10deg]">✧</div>
          <button
            type="button"
            className="relative w-[156px] h-[156px] rounded-full dockin-gradient p-1.5 box-border"
          >
            <div className="w-full h-full rounded-full overflow-hidden relative bg-white">
              <Image src={AVATARS[avatar]!} alt="Your avatar" fill className="object-cover" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex size-9 items-center justify-center rounded-full bg-white shadow-lg">
              <Camera className="size-4 text-ink" />
            </span>
          </button>
          <div className="absolute -bottom-1.5 right-[calc(50%-100px)] bg-[#14121C] text-white text-[11px] font-bold px-[11px] py-[5px] rounded-pill -rotate-6">
            lookin&apos; good
          </div>
        </div>

        {/* Avatar picker swatches */}
        <div className="flex gap-2.5 justify-center mt-[18px]">
          {AVATARS.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setAvatar(i)}
              aria-label={`Choose avatar ${i + 1}`}
              className={cn(
                "relative size-[30px] rounded-full overflow-hidden transition",
                avatar === i ? "ring-2 ring-offset-2 ring-offset-white ring-secondary" : "opacity-70"
              )}
            >
              <Image src={src} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>

        <div className="mt-[30px]">
          <AuthField label="What should we call you?" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex gap-2 mt-3.5 flex-wrap">
          {BATCHES.slice(0, 1).map((b, i) => (
            <button
              key={b}
              type="button"
              onClick={() => setBatch(i)}
              className={cn(
                "rounded-pill px-3.5 py-2.5 text-[13px] font-bold border-[1.5px] transition",
                batch === i ? "dockin-gradient text-white border-transparent" : "bg-input text-ink border-line/[0.08]"
              )}
            >
              {b}
            </button>
          ))}
          {HOSTELS.map((h, i) => (
            <button
              key={h}
              type="button"
              onClick={() => setHostel(i)}
              className={cn(
                "rounded-pill px-3.5 py-2.5 text-[13px] font-bold border-[1.5px] transition",
                hostel === i ? "dockin-gradient text-white border-transparent" : "bg-input text-ink border-line/[0.08]"
              )}
            >
              {h}
            </button>
          ))}
        </div>

        <Button size="lg" loading={saving} onClick={finish} className="w-full mt-auto pt-8">
          Continue
        </Button>
      </div>
    </main>
  );
}
