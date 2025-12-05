import type { NextConfig } from "next";


const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {

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
export default nextConfig;
// Configurar PWA (solo en producción)
//export default withPWA({
  //dest: "public",
  //register: true,
  //skipWaiting: true,
  //disable: isDev,
//})(nextConfig);

