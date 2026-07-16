import { BottomNav } from "@/components/layout/BottomNav";

// Auth is already enforced by middleware.ts (supabase.auth.getUser() there
// redirects unauthenticated requests to /login before this layout ever
// runs), and re-derived client-side by AuthListener/useAuthStore.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <main className="mx-auto max-w-md pb-[104px]">{children}</main>
      <BottomNav />
    </div>
  );
}
