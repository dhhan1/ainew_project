import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev server to be reachable from these origins (Next.js 16+)
  // Useful when accessing the dev URL from another machine on the LAN.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.182.184.187",
  ],
};

export default nextConfig;
