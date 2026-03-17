// @ts-ignore
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV === "development",
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, 
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pmgyydexqvotrlsqxmlm.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "bodegaferreterademty.com.mx",
        pathname: "/**",
      },
    ],
  },
};

export default withPWA(nextConfig);