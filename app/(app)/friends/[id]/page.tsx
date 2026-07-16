"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle, Camera as CameraIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useFriendProfile } from "@/hooks/useFriends";
import { useIsOnline } from "@/lib/realtime";

export default function FriendProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useFriendProfile(params.id);
  const online = useIsOnline(params.id);

  const profile = data?.profile;
  const name = profile?.display_name ?? profile?.username ?? "Friend";

  if (isLoading) {
    return <div className="min-h-dvh bg-white px-5 pt-safe text-sm text-ink-dim">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-white px-5 pt-safe">
        <p className="text-sm text-ink-dim">Couldn&apos;t find this person.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="px-5 pt-safe pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink -ml-1.5">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex flex-col items-center px-5">
        <Avatar name={name} size={96} online={online} />
        <div className="font-display font-extrabold text-xl text-ink mt-3">{name}</div>
        {online && <div className="text-[13px] font-bold text-success mt-1">Active now</div>}

        <div className="flex gap-3 mt-6 w-full">
          <Link href={`/chats/${params.id}`} className="flex-1">
            <Button variant="secondary" className="w-full gap-2">
              <MessageCircle className="w-4 h-4" /> Chat
            </Button>
          </Link>
          <Link href="/snaps/camera" className="flex-1">
            <Button className="w-full gap-2">
              <CameraIcon className="w-4 h-4" /> Snap
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
