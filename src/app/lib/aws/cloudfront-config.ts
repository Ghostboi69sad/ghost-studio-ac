import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

/**
 * تكوين CloudFront والثوابت
 */
const ORIGINS = {
  MAIN: 'ghost-studio.s3.eu-north-1.amazonaws.com',
  BACKUP: 'ghost-studio.s3.eu-north-1.amazonaws.com/backup',
  PUBLIC: 'ghost-studio.s3.eu-north-1.amazonaws.com/public',
};

const DISTRIBUTION_ID = 'E3DOMDR0FNW5ZV';
const OAI_IDS = ['E1IM7X15I55GZN', 'E30LM7Q2PLO1OG'];

// تكوين CloudFront Client
const cloudFront = new CloudFrontClient({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * الحصول على رابط الوسائط مع دعم التخزين المؤقت والتوقيع
 */
export async function getMediaUrl(
  key: string,
  options: {
    useBackup?: boolean;
    isPublic?: boolean;
  } = {}
): Promise<string> {
  try {
    // تحديد Origin المناسب
    let origin;
    if (options.isPublic) {
      origin = ORIGINS.PUBLIC;
      return `https://${origin}/${key}`; // لا نحتاج لتوقيع للملفات العامة
    } else {
      origin = options.useBackup ? ORIGINS.BACKUP : ORIGINS.MAIN;
    }

    // إنشاء رابط موقع للملفات الخاصة
    const url = `https://${origin}/${key}`;
    const signedUrl = await getSignedUrl({
      url,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!,
      dateLessThan: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    return signedUrl;
  } catch (error) {
    console.error('Error getting media URL:', error);
    throw new Error('Failed to generate media URL');
  }
}

/**
 * إبطال التخزين المؤقت
 */
export async function invalidateCache(paths: string[]) {
  try {
    await cloudFront.send(
      new CreateInvalidationCommand({
        DistributionId: DISTRIBUTION_ID,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: {
            Quantity: paths.length,
            Items: paths.map(path => (path.startsWith('/') ? path : `/${path}`)),
          },
        },
      })
    );
  } catch (error) {
    console.error('Error invalidating cache:', error);
    throw new Error('Failed to invalidate cache');
  }
}

export default cloudFront;
