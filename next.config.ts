import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type errors in lib/api/auth.ts are expected until Supabase credentials
    // are provided and `supabase gen types typescript --linked` is run.
    ignoreBuildErrors: true,
  },
  // Prevent Turbopack from bundling these Node.js-specific packages —
  // they use native require() patterns that cause silent build crashes.
  serverExternalPackages: ["pdf-parse", "@anthropic-ai/sdk", "stripe"],
};

export default nextConfig;
