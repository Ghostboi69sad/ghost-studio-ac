import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.MY_AWS_S3_BUCKET || 'ghost-studio';
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
      Metadata: {
        originalName: fileName,
        uploadDate: new Date().toISOString(),
      },
    });

    try {
      const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
        expiresIn: 3600 * 2,
      });

      const cloudFrontDomain = CLOUDFRONT_DOMAIN?.replace(/\/$/, '');
      const cloudFrontUrl = `${cloudFrontDomain}/${fileKey}`;

      return NextResponse.json({
        success: true,
        uploadUrl,
        fileKey,
        url: cloudFrontUrl,
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
