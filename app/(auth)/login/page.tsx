"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Button } from "@/components/ui/Button";
import { loginSchema } from "@/lib/schemas";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@bennett.edu.in";

function buildEmail(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  return v.includes("@") ? v.toLowerCase() : `${v.toLowerCase()}${EMAIL_DOMAIN}`;
}

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Wrong email or password. Try again?";
  if (/email not confirmed/i.test(message)) return "Check your inbox and confirm your email first.";
  if (/rate limit/i.test(message)) return "Too many attempts — wait a minute and try again.";
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fullEmail = buildEmail(email);
    const parsed = loginSchema.safeParse({ email: fullEmail, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);

    if (error) {
      setErrors({ form: friendlyAuthError(error.message) });
      return;
    }
    router.replace(searchParams.get("next") ?? "/dashboard");
    router.refresh();
  };

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
          Welcome back. <span className="text-secondary text-xl">✦</span>
        </h1>
        <p className="text-[15px] text-ink-dim mt-2.5 leading-relaxed">
          Log in with your Bennett email to get back to your people.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
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
            autoComplete="current-password"
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
            Log in
          </Button>
        </form>

        <div className="text-center text-[13px] text-ink/40 mt-4">or continue with</div>
        <div className="mt-3">
          <GoogleButton />
        </div>

        <div className="flex items-start gap-3 rounded-card bg-input border-[1.5px] border-line/[0.08] px-4 py-3.5 mt-5">
          <span className="dockin-gradient flex size-9 shrink-0 items-center justify-center rounded-btn">
            <ShieldCheck className="size-5 text-white" strokeWidth={2.4} />
          </span>
          <div>
            <p className="text-sm font-bold text-secondary">Bennett students only</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-dim">
              Use your official Bennett University email to access DockIn.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-ink-dim mt-6">
          New here?{" "}
          <Link href="/signup" className="font-bold text-secondary">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
