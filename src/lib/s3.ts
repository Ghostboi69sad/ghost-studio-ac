import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!
  }
});

export async function uploadToS3(file: File, key: string) {
  try {
    // تحويل الملف إلى Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);
    
    const getCommand = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
  } catch (error) {
    console.error('خطأ في رفع الملف إلى S3:', error);
    throw error;
  }
} 