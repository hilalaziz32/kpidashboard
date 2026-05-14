import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aggressive client router cache — second nav to a page within
  // these windows serves instantly from the in-memory RSC cache.
  experimental: {
    staleTimes: {
      dynamic: 30,  // dynamic pages (dashboards): 30s
      static: 180,  // static pages: 3 min
    },
  },
};

export default nextConfig;
