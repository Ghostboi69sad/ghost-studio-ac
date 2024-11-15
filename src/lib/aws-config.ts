import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsCredentialIdentity } from '@aws-sdk/types';

// تكوين AWS الموحد
export const awsConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1',
  bucket: process.env.NEXT_PUBLIC_S3_BUCKET || 'ghost-studio',
  endpoint: `https://${process.env.NEXT_PUBLIC_S3_BUCKET || 'ghost-studio'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1'}.amazonaws.com`,
  cloudfrontDomain: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  } as AwsCredentialIdentity,
};

// التحقق من وجود المفاتيح المطلوبة
if (!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || !process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY) {
  console.error('AWS credentials are missing!');
}

export const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: awsConfig.credentials,
  forcePathStyle: false,
});

export function getS3Url(key: string): string {
  return awsConfig.cloudfrontDomain
    ? `${awsConfig.cloudfrontDomain}/${key}`
    : `${awsConfig.endpoint}/${key}`;
}

export async function uploadToS3(file: File, key: string) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: awsConfig.bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);
    return getS3Url(key);
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ uploadUrl: string; url: string }> {
  const command = new PutObjectCommand({
    Bucket: awsConfig.bucket,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
      signableHeaders: new Set(['content-type', 'x-amz-server-side-encryption']),
    });

    return {
      uploadUrl,
      url: getS3Url(key),
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('فشل في الحصول على رابط الرفع');
  }
}

export function validateAwsConfig() {
  const requiredEnvVars = {
    NEXT_PUBLIC_AWS_ACCESS_KEY_ID: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    NEXT_PUBLIC_S3_BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}
