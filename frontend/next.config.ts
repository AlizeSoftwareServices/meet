import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === 'true' || process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(isStaticExport ? {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  } : {
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;

