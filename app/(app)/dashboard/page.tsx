import { HomeHeader } from "@/components/dashboard/HomeHeader";
import { StoriesRow } from "@/components/dashboard/StoriesRow";
import { WhosFreeBar } from "@/components/dashboard/WhosFreeBar";
import { FriendActivity } from "@/components/dashboard/FriendActivity";
import { GroupActivity } from "@/components/dashboard/GroupActivity";
import { FeedPost } from "@/components/dashboard/FeedPost";
import { QuickStats } from "@/components/dashboard/QuickStats";

export const metadata = { title: "Home" };

export default function DashboardPage() {
  return (
    <div className="relative min-h-dvh bg-bg">
      <div
        className="absolute top-[-30px] right-[-40px] w-[180px] h-[180px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,45,120,0.14), transparent 70%)" }}
      />
      <HomeHeader />
      <StoriesRow />
      <WhosFreeBar />
      <FriendActivity />
      <GroupActivity />
      <FeedPost />
      <QuickStats />
    </div>
  );
}
