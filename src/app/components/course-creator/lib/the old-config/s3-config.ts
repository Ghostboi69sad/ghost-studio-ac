import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const bucketName = process.env.MY_AWS_S3_BUCKET;

export const getS3Url = (key: string): string => {
  const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
  if (!cloudfrontDomain) {
    throw new Error('CloudFront domain not configured');
  }
  return `${cloudfrontDomain}/${key}`;
};
