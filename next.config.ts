import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL,
  },
};

export default nextConfig;
