import type { NextConfig } from "next";


const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
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
    ],
  },
};
export default nextConfig;
// Configurar PWA (solo en producción)
//export default withPWA({
  //dest: "public",
  //register: true,
  //skipWaiting: true,
  //disable: isDev,
//})(nextConfig);

