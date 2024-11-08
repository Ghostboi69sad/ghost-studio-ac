/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'd3sjwdcuh9ukar.cloudfront.net',
      process.env.NEXT_PUBLIC_S3_BUCKET + '.s3.' + process.env.NEXT_PUBLIC_AWS_REGION + '.amazonaws.com'
    ],
  }
};

export default config;
