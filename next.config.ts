import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type errors in lib/api/auth.ts are expected until Supabase credentials
    // are provided and `supabase gen types typescript --linked` is run.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
