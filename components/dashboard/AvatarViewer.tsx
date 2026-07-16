"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

// Registers the <model-viewer> custom element globally (Google's web
// component for glTF/.glb rendering — handles camera, lighting, and touch
// rotation with zero manual three.js scene setup). Loaded once, lazily,
// only on screens that actually render a 3D avatar.
function useModelViewerScript() {
  const [loaded, setLoaded] = useState(
    () => typeof window !== "undefined" && !!customElements.get("model-viewer")
  );
  useEffect(() => {
    if (loaded) return;
    const existing = document.querySelector('script[data-model-viewer]');
    if (existing) {
      existing.addEventListener("load", () => setLoaded(true));
      return;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4/dist/model-viewer.min.js";
    script.dataset.modelViewer = "true";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [loaded]);
  return loaded;
}

// TypeScript doesn't know about the <model-viewer> custom element by
// default — this augments JSX.IntrinsicElements just for this file's scope.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
        exposure?: string;
        "disable-zoom"?: boolean;
      };
    }
  }
}

export interface AvatarViewerProps {
  /** .glb model URL from Ready Player Me. null/undefined shows the "create your avatar" empty state. */
  modelUrl: string | null | undefined;
  size?: number;
}

/** Home screen hero: renders the user's customizable 3D avatar, or a prompt to create one. */
export function AvatarViewer({ modelUrl, size = 220 }: AvatarViewerProps) {
  const loaded = useModelViewerScript();
  const ref = useRef<HTMLElement>(null);

  if (!modelUrl) {
    return (
      <Link
        href="/profile/avatar-3d"
        className="flex flex-col items-center justify-center gap-2 dockin-gradient rounded-[32px] mx-auto"
        style={{ width: size, height: size }}
      >
        <Sparkles className="w-8 h-8 text-white" />
        <span className="text-white text-sm font-bold text-center px-4">Create your 3D avatar</span>
      </Link>
    );
  }

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {loaded ? (
        <model-viewer
          ref={ref}
          src={modelUrl}
          alt="Your DockIn avatar"
          camera-controls
          auto-rotate
          disable-zoom
          shadow-intensity="0.7"
          exposure="1.1"
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <div className="w-full h-full rounded-[32px] bg-input animate-pulse" />
      )}
      <Link
        href="/profile/avatar-3d"
        aria-label="Customize avatar"
        className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full dockin-gradient flex items-center justify-center shadow-lg border-2 border-bg"
      >
        <Sparkles className="w-4 h-4 text-white" />
      </Link>
    </div>
  );
}
