import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'd3sjwdcuh9ukar.cloudfront.net',
      'ghost-studio.s3.eu-north-1.amazonaws.com',
      process.env.NEXT_PUBLIC_S3_BUCKET + '.s3.' + process.env.NEXT_PUBLIC_AWS_REGION + '.amazonaws.com'
    ],
    unoptimized: true
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  typescript: {
    ignoreBuildErrors: true
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: '/courses/:path*',
          destination: '/courses/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
