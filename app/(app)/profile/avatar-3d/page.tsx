"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useUpdateProfile } from "@/hooks/useProfile";

// Ready Player Me subdomain. "demo" works immediately with zero signup for
// testing — for production, create a free subdomain at
// https://studio.readyplayer.me (Settings → Applications) and swap it in
// here so avatars are scoped to your own app instead of the shared demo.
const RPM_SUBDOMAIN = "demo";

type RpmMessage = {
  source?: string;
  eventName?: string;
  data?: { url?: string; id?: string };
};

function parseRpmEvent(event: MessageEvent): RpmMessage | null {
  try {
    return typeof event.data === "string" ? JSON.parse(event.data) : event.data;
  } catch {
    return null;
  }
}

/**
 * Full-screen Ready Player Me Avatar Creator — lets a user build a
 * customizable 3D avatar (face, hair, outfit, accessories). On export, the
 * resulting .glb model URL is saved to their profile and used as the Home
 * screen hero avatar (see components/dashboard/AvatarViewer.tsx).
 */
export default function Avatar3DCreatorPage() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const json = parseRpmEvent(event);
      if (!json || json.source !== "readyplayerme") return;

      if (json.eventName === "v1.frame.ready") {
        setReady(true);
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ target: "readyplayerme", type: "subscribe", eventName: "v1.**" }),
          "*"
        );
        return;
      }

      if (json.eventName === "v1.avatar.exported" && json.data?.url) {
        setSaving(true);
        updateProfile
          .mutateAsync({ avatar_url_3d: json.data.url })
          .then(() => router.replace("/dashboard"))
          .catch(() => setSaving(false));
      }
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("message", onMessage as EventListener);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("message", onMessage as EventListener);
    };
  }, [router, updateProfile]);

  return (
    <div className="fixed inset-0 z-50 bg-[#14121C]">
      <button
        onClick={() => router.back()}
        aria-label="Close"
        className="absolute top-safe right-4 z-10 mt-4 w-9 h-9 rounded-full bg-white/[0.14] backdrop-blur-md flex items-center justify-center text-white"
      >
        <X className="w-4 h-4" />
      </button>

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/60 text-sm">Loading avatar creator…</p>
        </div>
      )}

      {saving && (
        <div className="absolute inset-0 z-20 bg-[#14121C] flex items-center justify-center">
          <p className="text-white/80 text-sm font-semibold">Saving your avatar…</p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={`https://${RPM_SUBDOMAIN}.readyplayer.me/avatar?frameApi`}
        className="w-full h-full border-0"
        allow="camera *; microphone *; clipboard-write"
        title="Ready Player Me avatar creator"
      />
    </div>
  );
}
