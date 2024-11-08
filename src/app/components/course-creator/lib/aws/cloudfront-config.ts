import { CloudFrontClient } from '@aws-sdk/client-cloudfront';

const cloudFront = new CloudFrontClient({
  region: process.env.MY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

const CLOUDFRONT_DOMAIN =
  process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || 'https://d3sjwdcuh9ukar.cloudfront.net';

export const getMediaUrl = (key: string): string => {
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }

  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  return `${CLOUDFRONT_DOMAIN}/${cleanKey}`;
};

export const getSignedUrl = async (key: string): Promise<string> => {
  try {
    const response = await fetch('/api/get-signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      throw new Error('Failed to get signed URL');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return getMediaUrl(key);
  }
};

export const getCloudfrontDomain = (): string => {
  return CLOUDFRONT_DOMAIN;
};

export default cloudFront;
