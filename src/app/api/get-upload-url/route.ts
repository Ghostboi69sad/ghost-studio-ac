import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  },
  forcePathStyle: true
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET || 'ghost-studio';
const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;

export async function POST(req: Request) {
  try {
    const { fileName, fileType } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 });
    }

    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const fileKey = fileType.startsWith('video/')
      ? `videos/${uniqueFileName}`
      : `files/${uniqueFileName}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        originalName: fileName,
        uploadDate: new Date().toISOString(),
      },
    });

    try {
      const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
        expiresIn: 3600,
        signableHeaders: new Set(['x-amz-server-side-encryption'])
      });

      return NextResponse.json({
        success: true,
        uploadUrl,
        fileKey,
        url: `${CLOUDFRONT_DOMAIN}/${fileKey}`,
        metadata: {
          originalName: fileName,
          contentType: fileType,
          path: fileKey,
        },
      });
    } catch (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling upload request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
