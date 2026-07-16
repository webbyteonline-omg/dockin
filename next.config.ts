import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Type safety is enforced via `npm run typecheck` (tsc --noEmit) in CI;
  // skipping the duplicate pass here keeps builds fast.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  compiler: {
    // Strip console.* calls from production client bundles — smaller JS,
    // no console overhead on low-end mobile devices.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  experimental: {
    // Inlines critical CSS and defers the rest — fewer render-blocking
    // requests on first paint.
    optimizeCss: true,
    // Tree-shakes these libraries so only the icons/components actually
    // used are bundled instead of the whole package.
    optimizePackageImports: ["recharts", "framer-motion", "lucide-react", "@supabase/supabase-js"],
  },
  // Empty object opts this config into Turbopack's dev/build pipeline
  // (falls back to webpack automatically when Turbopack isn't invoked).
  turbopack: {},
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days — app icons rarely change
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      source: "/manifest.json",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
    },
    {
      // Digital Asset Links — required for the TWA (Android app wrapper) to
      // verify it's allowed to open this domain's links without showing a
      // browser address bar. Served with an explicit JSON content-type and
      // open CORS since Android's verifier fetches it directly, not via the
      // app's own origin.
      source: "/.well-known/assetlinks.json",
      headers: [
        { key: "Content-Type", value: "application/json" },
        { key: "Access-Control-Allow-Origin", value: "*" },
      ],
    },
  ],
};

export default nextConfig;
