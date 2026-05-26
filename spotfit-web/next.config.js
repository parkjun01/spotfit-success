/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel Serverless 최적화
  experimental: {
    serverComponentsExternalPackages: ['jsonwebtoken', 'bcryptjs', 'node-cron'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
