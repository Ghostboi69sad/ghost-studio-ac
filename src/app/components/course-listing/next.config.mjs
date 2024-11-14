import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'd3sjwdcuh9ukar.cloudfront.net',
      'ghost-studio.s3.eu-north-1.amazonaws.com',
      process.env.NEXT_PUBLIC_S3_BUCKET + '.s3.' + process.env.NEXT_PUBLIC_AWS_REGION + '.amazonaws.com'
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
  onError: (error) => {
    console.error('Next.js error:', error);
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [];
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
