import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // redis is an optional dependency for rate-limiting, only loaded when
  // RATE_LIMIT_REDIS_URL is set. Keep it external so the build doesn't fail
  // to resolve it when the package isn't installed.
  serverExternalPackages: ["redis"],
  turbopack: {
    root: '/home/hruthvik9487/Documents/quizoff/FIFA-APP/fifa-transit-app'
  }
};

export default nextConfig;
