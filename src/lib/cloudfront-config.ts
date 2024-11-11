import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

const DISTRIBUTION_ID = process.env.NEXT_PUBLIC_CLOUDFRONT_DISTRIBUTION_ID;
const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

// تعريف المصادر
const ORIGINS = {
  MAIN: process.env.NEXT_PUBLIC_S3_BUCKET ? 
    `${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1'}.amazonaws.com` : 
    'ghost-studio.s3.eu-north-1.amazonaws.com',
  BACKUP: `${process.env.NEXT_PUBLIC_S3_BUCKET || 'ghost-studio'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1'}.amazonaws.com/backup`,
  PUBLIC: `${process.env.NEXT_PUBLIC_S3_BUCKET || 'ghost-studio'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1'}.amazonaws.com/public`
};

export const cloudFront = new CloudFrontClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!
  }
});

export async function getMediaUrl(key: string, options: {
  useBackup?: boolean;
  isPublic?: boolean;
  useSignedUrl?: boolean;
  preload?: boolean;
} = {}): Promise<string> {
  try {
    if (key.startsWith('http')) {
      return key;
    }

    const cleanKey = key.startsWith('/') ? key.slice(1) : key;

    if (CLOUDFRONT_DOMAIN) {
      const url = `${CLOUDFRONT_DOMAIN}/${cleanKey}`;
      
      if (options.useSignedUrl) {
        if (!process.env.CLOUDFRONT_KEY_PAIR_ID || !process.env.CLOUDFRONT_PRIVATE_KEY) {
          throw new Error('CloudFront signing credentials not configured');
        }

        const signedUrl = await getSignedUrl({
          url,
          keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
          privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
          dateLessThan: new Date(Date.now() + 3600 * 1000).toISOString()
        });

        if (options.preload && typeof window !== 'undefined') {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'video';
          link.href = signedUrl;
          document.head.appendChild(link);
        }

        return signedUrl;
      }

      return url;
    }

    let origin;
    if (options.isPublic) {
      origin = ORIGINS.PUBLIC;
    } else {
      origin = options.useBackup ? ORIGINS.BACKUP : ORIGINS.MAIN;
    }

    return `https://${origin}/${cleanKey}`;
  } catch (error) {
    console.error('Error getting media URL:', error);
    throw new Error('Failed to generate media URL');
  }
}

export async function invalidateCache(paths: string[]) {
  if (!DISTRIBUTION_ID) {
    throw new Error('CloudFront distribution ID not configured');
  }

  try {
    await cloudFront.send(new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths.map(path => path.startsWith('/') ? path : `/${path}`)
        }
      }
    }));
  } catch (error) {
    console.error('Error invalidating cache:', error);
    throw new Error('Failed to invalidate cache');
  }
} 