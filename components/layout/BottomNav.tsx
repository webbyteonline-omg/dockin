"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, LayoutGrid, User, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/friends", label: "Friends", icon: Users },
] as const;

const TABS_RIGHT = [
  { href: "/groups", label: "Groups", icon: LayoutGrid },
  { href: "/profile", label: "Me", icon: User },
] as const;

/** Sticky bottom tab bar with a raised gradient camera FAB, matching the DockIn mockup exactly. */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="fixed left-0 right-0 bottom-0 z-40 h-[88px] bg-card border-t-[1.5px] border-line/[0.08] flex items-center justify-around pb-safe">
      {TABS.map((tab) => (
        <NavItem key={tab.href} {...tab} active={isActive(tab.href)} />
      ))}

      <div className="w-[52px]" />

      {TABS_RIGHT.map((tab) => (
        <NavItem key={tab.href} {...tab} active={isActive(tab.href)} />
      ))}

      <button
        onClick={() => router.push("/snaps/camera")}
        aria-label="Open camera"
        className="absolute left-1/2 -translate-x-1/2 -top-7 w-16 h-16 rounded-full dockin-gradient flex items-center justify-center shadow-[0_0_0_4px_rgb(var(--card)),0_8px_20px_rgba(255,107,53,0.35)]"
      >
        <Camera className="w-6 h-6 text-white" strokeWidth={2.2} />
      </button>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 w-[52px]">
      <Icon
        className={cn("w-6 h-6", active ? "text-secondary" : "text-ink-faint")}
        strokeWidth={active ? 2.4 : 2}
      />
      <span className={cn("text-[10.5px] font-bold", active ? "text-secondary" : "text-ink-faint")}>
        {label}
      </span>
    </Link>
  );
}
