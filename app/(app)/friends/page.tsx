"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  useFriendRequests,
  useFriends,
  useRespondToRequest,
  useSendFriendRequest,
  useUserSearch,
} from "@/hooks/useFriends";
import { useIsOnline } from "@/lib/realtime";
import { vibeStatus } from "@/lib/utils";

function OnlineFriend({ id, name }: { id: string; name: string }) {
  const online = useIsOnline(id);
  if (!online) return null;
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 w-[66px]">
      <Avatar name={name} size={52} online />
      <div className="text-[11px] font-semibold text-ink text-center">{vibeStatus(id)}</div>
    </div>
  );
}

export default function FriendsPage() {
  const { data: friends = [] } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const respond = useRespondToRequest();
  const sendRequest = useSendFriendRequest();
  const [search, setSearch] = useState("");
  const { data: searchResults = [] } = useUserSearch(search);

  const incoming = requests.filter((r) => r.direction === "incoming");

  return (
    <div className="min-h-dvh bg-bg">
      <PageHeader
        title="Friends"
        action={
          <Link
            href="#add"
            className="dockin-gradient text-white text-[12.5px] font-bold px-4 py-2.5 rounded-pill -rotate-2 inline-block"
          >
            + Add
          </Link>
        }
      />

      <div className="px-5 pb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search friends"
          className="w-full bg-white border-[1.5px] border-line/[0.08] rounded-input px-4 py-3 text-[13.5px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        {search.trim().length >= 2 && (
          <div className="mt-2 flex flex-col gap-1">
            {searchResults.map((u) => {
              const name = u.display_name ?? u.username ?? "User";
              return (
                <div key={u.id} className="flex items-center gap-3 bg-white rounded-input px-3 py-2.5 border-[1.5px] border-line/[0.08]">
                  <Avatar name={name} size={38} />
                  <div className="flex-1 text-sm font-semibold text-ink">{name}</div>
                  <Button size="sm" onClick={() => sendRequest.mutate(u.id)} loading={sendRequest.isPending}>
                    Add
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {incoming.map((req) => {
        const name = req.profile?.display_name ?? req.profile?.username ?? "Someone";
        return (
          <div key={req.id} className="mx-5 mb-4 relative bg-[#14121C] rounded-hero p-4 overflow-hidden">
            <div
              className="absolute rounded-full pointer-events-none"
              style={{ top: -30, right: -20, width: 110, height: 110, background: "radial-gradient(circle, rgba(255,45,120,0.35), transparent 70%)" }}
            />
            <div className="absolute top-2.5 right-3.5 text-accent text-lg rotate-[12deg]">✦</div>
            <div className="text-white text-[13px] font-bold mb-3 relative">{name} wants to connect</div>
            <div className="flex gap-2 items-center relative">
              <Avatar name={name} size={38} />
              <div className="flex-1 text-[12px] text-white/55">New friend request</div>
              <button
                onClick={() => respond.mutate({ request: req, accept: true })}
                className="dockin-gradient text-white text-xs font-bold px-3 py-2 rounded-pill"
              >
                Accept
              </button>
              <button
                onClick={() => respond.mutate({ request: req, accept: false })}
                className="bg-white/[0.14] text-white text-xs font-bold px-3 py-2 rounded-pill"
              >
                Decline
              </button>
            </div>
          </div>
        );
      })}

      {friends.length > 0 && (
        <>
          <div className="px-5 pb-2.5 flex items-center gap-2">
            <span className="text-xs font-bold text-ink-faint tracking-wide">ONLINE NOW</span>
          </div>
          <div className="flex gap-4 px-5 pb-5 overflow-x-auto no-scrollbar">
            {friends.map((f) => (
              <OnlineFriend key={f.id} id={f.id} name={f.display_name ?? f.username ?? "Friend"} />
            ))}
          </div>

          <div className="px-5 pb-2 text-xs font-bold text-ink-faint tracking-wide">
            ALL FRIENDS · {friends.length}
          </div>
          <div className="pb-6">
            {friends.map((f) => {
              const name = f.display_name ?? f.username ?? "Friend";
              return (
                <Link key={f.id} href={`/friends/${f.id}`} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={name} size={46} />
                  <div className="flex-1">
                    <div className="text-[14.5px] font-bold text-ink">{name}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {friends.length === 0 && incoming.length === 0 && (
        <p className="px-5 text-sm text-ink-dim">No friends yet — search above to find your batch.</p>
      )}
    </div>
  );
}
