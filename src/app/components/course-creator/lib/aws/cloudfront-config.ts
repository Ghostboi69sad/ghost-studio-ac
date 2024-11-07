import { CloudFrontClient } from "@aws-sdk/client-cloudfront";

const cloudFront = new CloudFrontClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!
  }
});

const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || 'https://d3sjwdcuh9ukar.cloudfront.net';

export const getMediaUrl = (key: string): string => {
  // إذا كان URL كاملاً، أعد نفس URL
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }

  // إذا كان المفتاح يبدأ بـ '/'، قم بإزالته
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;

  // إنشاء URL CloudFront
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
    return getMediaUrl(key); // استخدم URL العام كنسخة احتياطية
  }
};

export const getCloudfrontDomain = (): string => {
  return CLOUDFRONT_DOMAIN;
};

export default cloudFront; 