import Link from "next/link";
import { Bell, Grid2x2 } from "lucide-react";

/** Top header for Home: bold "DockIn" wordmark + bell (with unread dot) + grid icon, both white bordered circle buttons. */
export function HomeHeader() {
  return (
    <div className="pt-safe px-5 flex items-center justify-between">
      <div className="font-display font-extrabold text-[22px] text-ink">DockIn</div>
      <div className="flex gap-2.5">
        <Link
          href="/notifications"
          className="relative w-10 h-10 rounded-full bg-white border-[1.5px] border-line/[0.08] flex items-center justify-center"
        >
          <Bell className="w-[18px] h-[18px] text-ink" strokeWidth={2.2} />
          <span className="absolute top-[6px] right-[7px] w-2 h-2 rounded-full bg-secondary border-[1.5px] border-white" />
        </Link>
        <Link
          href="/groups"
          className="w-10 h-10 rounded-full bg-white border-[1.5px] border-line/[0.08] flex items-center justify-center"
        >
          <Grid2x2 className="w-[17px] h-[17px] text-ink" strokeWidth={2.2} />
        </Link>
      </div>
    </div>
  );
}
