import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Transpile the workspace packages (shipped as TS source).
  transpilePackages: ['@darjeeling/shared', '@darjeeling/tokens'],
  // Keep the web app lean (Netlify credits): menu photos come straight from
  // Supabase Storage via <img>, so Next's image optimizer is not required.
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
