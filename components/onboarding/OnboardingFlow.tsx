"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check, Plus } from "lucide-react";
import { DockInLogo } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateSubject, useSubjects } from "@/hooks/useAttendance";
import { usePushNotifications } from "@/hooks/useNotifications";
import { useMyProfile, useUpdateProfile } from "@/hooks/useProfile";
import { SUBJECT_COLORS } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";

const SUGGESTIONS = ["Mathematics", "Physics", "Chemistry", "CS101", "English", "Electronics"];
const TOTAL_STEPS = 3;

function Dots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-1.5 mb-6" aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <motion.span
          key={i}
          animate={{ width: i === step ? 20 : 6 }}
          className={`h-1.5 rounded-full ${i <= step ? "bg-secondary" : "bg-line/10"}`}
        />
      ))}
    </div>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const updateProfile = useUpdateProfile();
  const createSubject = useCreateSubject();
  const { data: subjects } = useSubjects();
  const push = usePushNotifications();
  const profileQuery = useMyProfile();

  const [subjectName, setSubjectName] = useState("");
  const [colorIndex, setColorIndex] = useState(0);

  // Safety net: if this device's local "onboarded" flag was stale but the
  // server says the account is already onboarded, bounce straight back out.
  useEffect(() => {
    if (profileQuery.data?.onboarded) {
      setOnboarded(true);
      router.replace("/dashboard");
    }
  }, [profileQuery.data, setOnboarded, router]);

  const addSubject = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createSubject.mutateAsync({
      name: trimmed,
      color: SUBJECT_COLORS[colorIndex % SUBJECT_COLORS.length] ?? "#FF6B35",
      required_percentage: 75,
    });
    setColorIndex((i) => i + 1);
    setSubjectName("");
  };

  const finish = async () => {
    setFinishing(true);
    setOnboarded(true);
    try {
      await updateProfile.mutateAsync({ onboarded: true });
    } catch {
      // local flag still set — profile sync will catch up
    }
    const confetti = (await import("canvas-confetti")).default;
    void confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 }, colors: ["#FF6B35", "#FF2D78", "#FFD166", "#2FE0A3"] });
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 1400);
  };

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));

  const steps: React.ReactNode[] = [
    // 1 — Welcome
    <div key="welcome" className="text-center">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 160 }}
        className="flex justify-center mb-6"
      >
        <div className="dockin-gradient flex size-[76px] items-center justify-center rounded-card">
          <DockInLogo size={40} />
        </div>
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="font-display font-extrabold text-2xl tracking-tight text-ink"
      >
        Welcome to DockIn
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-2 text-ink-dim"
      >
        Campus social, remixed.
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <Button size="lg" className="w-full mt-8" onClick={next}>
          Let&apos;s go
        </Button>
      </motion.div>
    </div>,

    // 2 — Subjects
    <div key="subjects">
      <h2 className="font-display font-bold text-xl text-center text-ink">Add your subjects</h2>
      <p className="mt-1.5 text-sm text-ink-dim text-center mb-5">
        DockIn tracks attendance per subject and tells you exactly how many classes you can bunk.
      </p>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Subject name"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addSubject(subjectName);
            }
          }}
        />
        <Button
          onClick={() => void addSubject(subjectName)}
          loading={createSubject.isPending}
          disabled={!subjectName.trim()}
          aria-label="Add subject"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTIONS.filter(
          (s) => !(subjects ?? []).some((sub) => sub.name.toLowerCase() === s.toLowerCase())
        ).map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => void addSubject(suggestion)}
            className="px-3 py-2 rounded-pill text-xs font-bold border-[1.5px] border-line/[0.08] text-ink-dim hover:border-primary hover:text-primary transition-colors"
          >
            + {suggestion}
          </button>
        ))}
      </div>
      {(subjects ?? []).length > 0 && (
        <div className="space-y-1.5 mb-4">
          {(subjects ?? []).map((subject) => (
            <div key={subject.id} className="flat-card-plain flex items-center gap-2.5 rounded-input px-3 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
              <span className="flex-1 text-sm font-medium text-ink">{subject.name}</span>
              <Check className="h-4 w-4 text-success" />
            </div>
          ))}
        </div>
      )}
      <Button size="lg" className="w-full" onClick={next}>
        {(subjects ?? []).length > 0 ? "Continue" : "Skip for now"}
      </Button>
    </div>,

    // 3 — Notifications
    <div key="notifications" className="text-center">
      <div className="flex justify-center mb-5">
        <div className="h-16 w-16 rounded-card bg-primary-dim grid place-items-center">
          <BellRing className="h-8 w-8 text-primary" />
        </div>
      </div>
      <h2 className="font-display font-bold text-xl text-ink">Never miss what matters</h2>
      <p className="mt-1.5 text-sm text-ink-dim mb-6">
        Friend activity, snap replies, and exam reminders — all as push notifications.
      </p>
      <Button
        size="lg"
        className="w-full"
        loading={push.busy}
        onClick={async () => {
          await push.subscribe();
          void finish();
        }}
      >
        Enable notifications
      </Button>
      <button
        onClick={() => void finish()}
        disabled={finishing}
        className="w-full min-h-[44px] mt-1 text-sm text-ink-dim hover:text-ink"
      >
        Skip
      </button>
    </div>,
  ];

  return (
    <div className="min-h-dvh bg-bg flex flex-col justify-center px-5 py-10">
      <div className="flat-card mx-auto w-full max-w-sm rounded-card p-6">
        {finishing ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-3xl mb-3">🎉</p>
            <h2 className="font-display font-black text-2xl text-ink">You&apos;re all set!</h2>
            <p className="mt-2 text-ink-dim text-sm">Taking you to your home feed…</p>
          </motion.div>
        ) : (
          <>
            <Dots step={step} />
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.1 }}
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
