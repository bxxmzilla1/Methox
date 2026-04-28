import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // Hero + card images are uploaded via Server Actions; default ~1MB rejects most phone photos
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default withPWA(nextConfig);
