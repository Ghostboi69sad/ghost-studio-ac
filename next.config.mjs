/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      process.env.NEXT_PUBLIC_S3_BUCKET + '.s3.' + process.env.NEXT_PUBLIC_AWS_REGION + '.amazonaws.com'
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;