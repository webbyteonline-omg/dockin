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
    // Tree-shakes these libraries so only the icons/components actually
    // used are bundled instead of the whole package.
    //
    // NOTE: `optimizeCss` (via critters) was removed here — critters reads
    // files from disk using __dirname-relative paths, and Next's build
    // pipeline was pulling that code path into the Edge middleware bundle,
    // which doesn't have __dirname and crashed every request with
    // `ReferenceError: __dirname is not defined` (MIDDLEWARE_INVOCATION_FAILED
    // on Vercel). Also dropped @supabase/supabase-js from
    // optimizePackageImports for the same reason — its barrel-file
    // tree-shake transform was implicated in the same crash.
    optimizePackageImports: ["recharts", "framer-motion", "lucide-react"],
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
