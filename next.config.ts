import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // redis is an optional dependency for rate-limiting, only loaded when
  // RATE_LIMIT_REDIS_URL is set. Keep it external so the build doesn't fail
  // to resolve it when the package isn't installed.
  serverExternalPackages: ["redis"],
  // Remove hardcoded absolute path to prevent build failures on other machines/CI
  // turbopack configuration is handled automatically by Next.js in dev mode
};

export default nextConfig;
