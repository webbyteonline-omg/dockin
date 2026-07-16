import type { Metadata, Viewport } from "next";
import { Unbounded, Plus_Jakarta_Sans, Caveat } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-jakarta",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-unbounded",
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  title: { default: "DockIn", template: "%s · DockIn" },
  description:
    "The social hub for Bennettians — snaps, chats, groups, friends, and academics, all in one place.",
  manifest: "/manifest.json",
  applicationName: "DockIn",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DockIn",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF2D78",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // interactive-widget=resizes-content: on Android, the on-screen keyboard
  // shrinks the visual viewport instead of overlaying it, so a fixed
  // bottom-sheet's content resizes and stays above the keyboard rather than
  // being covered by it.
  interactiveWidget: "resizes-content",
};

// Applies the saved theme before first paint — no flash on load.
const themeBootScript = `(function(){try{var t="light";var raw=localStorage.getItem("pulse-settings");if(raw){var s=JSON.parse(raw);if(s&&s.state&&s.state.theme)t=s.state.theme}document.documentElement.classList.remove("dark","light","amoled");document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add("light")}})();`;

// Every page fetches from Supabase almost immediately on mount — warming
// the connection (DNS + TLS) before that request fires shaves the
// round-trip off the very first query.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`light ${jakarta.variable} ${unbounded.variable} ${caveat.variable}`}
      suppressHydrationWarning
    >
      <head>
        {supabaseOrigin && (
          <>
            <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        )}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
