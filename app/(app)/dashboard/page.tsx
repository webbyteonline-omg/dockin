import { HomeHeader } from "@/components/dashboard/HomeHeader";
import { StoriesRow } from "@/components/dashboard/StoriesRow";
import { AvatarStatsHero } from "@/components/dashboard/AvatarStatsHero";

export const metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <div className="relative min-h-dvh bg-bg pb-[110px]">
      <div
        className="absolute top-[-30px] right-[-40px] w-[180px] h-[180px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,45,120,0.14), transparent 70%)" }}
      />
      <HomeHeader />
      <StoriesRow />
      <AvatarStatsHero />
    </div>
  );
}
