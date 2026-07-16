export function DockInLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="dockin-logo-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="#FF6B35" />
          <stop offset="1" stopColor="#FF2D78" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#dockin-logo-grad)" />
      <path
        d="M15 14h8.5c6 0 10 4 10 10s-4 10-10 10H15V14z"
        fill="none"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19.5" cy="24" r="2.6" fill="white" />
    </svg>
  );
}
