import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const REGION = 'eu-north-1';
const BUCKET_NAME = 'ghost-studio';
const CLOUDFRONT_DOMAIN = 'https://d3sjwdcuh9ukar.cloudfront.net';

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = file.type;

    let folder = 'files';
    if (fileType.startsWith('video/')) {
      folder = 'videos';
    }

    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const fileKey = `${folder}/${uniqueFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: fileType,
    });

    await s3Client.send(command);

    return NextResponse.json({
      url: `${CLOUDFRONT_DOMAIN}/${fileKey}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
