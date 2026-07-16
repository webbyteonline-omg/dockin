"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";
import { signupSchema } from "@/lib/schemas";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@bennett.edu.in";

function buildEmail(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return v.includes("@") ? v.toLowerCase() : `${v.toLowerCase()}${EMAIL_DOMAIN}`;
}

function friendlyAuthError(message: string): string {
  if (/already registered/i.test(message)) return "That email already has an account — sign in instead.";
  if (/password should be/i.test(message)) return "Password is too weak — use at least 6 characters.";
  if (/rate limit/i.test(message)) return "Too many attempts — wait a minute and try again.";
  return message;
}

export default function SignupPage() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fullEmail = buildEmail(email);
    const parsed = signupSchema.safeParse({ name: name || "New Bennettian", email: fullEmail, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ name: f.name?.[0], email: f.email?.[0], password: f.password?.[0] });
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { name: parsed.data.name } },
    });
    setLoading(false);

    if (error) {
      setErrors({ form: friendlyAuthError(error.message) });
      return;
    }
    if (!data.session) {
      setNeedsConfirmation(true);
      return;
    }
    router.replace("/avatar-setup");
    router.refresh();
  };

  if (needsConfirmation) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-white">
        <div className="dockin-gradient mb-5 flex size-16 items-center justify-center rounded-card">
          <MailCheck className="size-8 text-white" />
        </div>
        <h1 className="font-display font-extrabold text-2xl text-ink">Check your inbox</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-ink-dim">
          We sent a confirmation link to <span className="font-semibold text-ink">{buildEmail(email)}</span>. Tap it, then log in.
        </p>
        <Link href="/login" className="mt-7 w-full max-w-xs">
          <Button variant="secondary" size="lg" className="w-full">
            Back to log in
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh bg-white overflow-hidden">
      <div
        className="absolute rounded-full opacity-[0.14] dockin-gradient"
        style={{ top: -70, right: -70, width: 220, height: 220 }}
      />
      <div
        className="absolute rounded-full bg-accent opacity-[0.16]"
        style={{ bottom: 60, left: -50, width: 150, height: 150 }}
      />

      <div className="relative flex flex-col px-[26px] pt-safe pb-10">
        <div className="pt-safe" />
        <span className="self-start bg-[#14121C] text-white text-[11px] font-bold tracking-wide uppercase px-3.5 py-[7px] rounded-pill mt-6">
          Bennett University
        </span>

        <h1 className="font-display font-extrabold text-[33px] leading-[1.12] text-ink mt-6">
          Welcome to
          <br />
          the block. <span className="text-secondary text-xl">✦</span>
        </h1>
        <p className="text-[15px] text-ink-dim mt-2.5 leading-relaxed">
          Sign up with your Bennett email to find your batch, your hostel, your people.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
          <AuthField
            label="Name"
            type="text"
            autoComplete="name"
            placeholder="Ananya Rao"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <AuthField
            label="Email"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="ananya.rao"
            suffix={email.includes("@") ? undefined : EMAIL_DOMAIN}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <AuthField
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="shrink-0 text-ink-dim hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            }
          />

          {errors.form && (
            <p className="rounded-input bg-danger-dim px-4 py-3 text-sm font-medium text-danger" role="alert">
              {errors.form}
            </p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
            Create account
          </Button>
        </form>

        <div className="text-center text-[13px] text-ink/40 mt-4">or continue with</div>
        <div className="flex gap-3 mt-3">
          <GoogleButton compact />
          <button
            type="button"
            onClick={() => showToast("Apple sign-in is coming soon 🍎")}
            className="flex-1 flex items-center justify-center gap-2 rounded-btn py-3.5 text-sm font-bold text-ink bg-white border-[1.5px] border-line/[0.12]"
          >
            <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-ink" aria-hidden>
              <path d="M16.365 1.43c0 1.14-.462 2.101-1.203 2.85-.797.812-2.098 1.446-3.16 1.363-.135-1.086.42-2.223 1.15-2.928.813-.79 2.19-1.37 3.213-1.285zm3.868 16.98c-.36.83-.532 1.2-.994 1.94-.646 1.037-1.557 2.328-2.686 2.34-1.003.011-1.26-.653-2.62-.645-1.362.008-1.643.658-2.65.647-1.13-.012-1.995-1.176-2.64-2.213-1.813-2.91-2.004-6.325-.885-8.144.794-1.288 2.048-2.043 3.227-2.043 1.199 0 1.953.66 2.945.66.963 0 1.548-.662 2.933-.662 1.05 0 2.16.572 2.951 1.56-2.594 1.421-2.174 5.13.42 6.505z" />
            </svg>
            Apple
          </button>
        </div>

        <p className="text-center text-sm text-ink-dim mt-6">
          Already on DockIn?{" "}
          <Link href="/login" className="font-bold text-secondary">
            Log in
          </Link>
        </p>
      </div>

      {toast && (
        <div
          className="fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-pill bg-[#14121C] px-4 py-2.5 text-xs font-bold text-white shadow-xl"
          role="status"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
