import { cn } from "@/lib/utils";

// Deterministic solid-color avatar background — same person always gets the
// same color across sessions/screens, matching the mockup's flat colored
// initials circles (KM orange, RS magenta, IK ink, SI orange, etc).
const AVATAR_COLORS = ["#FF6B35", "#FF2D78", "#FF7A3D", "#14121C"] as const;

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  name: string;
  size?: number;
  /** Wraps the avatar in the signature sunset->magenta gradient ring (stories row). */
  ringed?: boolean;
  /** Adds a small green dot for online presence. */
  online?: boolean;
  shape?: "circle" | "square";
  className?: string;
}

export function Avatar({ name, size = 44, ringed, online, shape = "circle", className }: AvatarProps) {
  const color = avatarColor(name);
  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";
  const inner = (
    <div
      className={cn(
        "flex items-center justify-center font-bold text-white shrink-0",
        radius,
        className
      )}
      style={{ width: size, height: size, background: color, fontSize: size * 0.32 }}
    >
      {initials(name)}
    </div>
  );

  if (!ringed && !online) return inner;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {ringed ? (
        <div
          className={cn("dockin-gradient p-[2.5px] box-border", radius)}
          style={{ width: size, height: size }}
        >
          <div
            className={cn("w-full h-full box-border border-2 border-bg", radius)}
            style={{ background: color }}
          >
            <div className="w-full h-full flex items-center justify-center font-bold text-white" style={{ fontSize: size * 0.32 }}>
              {initials(name)}
            </div>
          </div>
        </div>
      ) : (
        inner
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-success border-2 border-bg"
          style={{ width: size * 0.25, height: size * 0.25 }}
        />
      )}
    </div>
  );
}
