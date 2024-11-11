import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, awsConfig, validateAwsConfig } from '../../../lib/aws-config';

export async function POST(req: Request) {
  try {
    // التحقق من التكوين قبل المتابعة
    validateAwsConfig();

    const { fileName, fileType } = await req.json();
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' }, 
        { status: 400 }
      );
    }

    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const fileKey = fileType.startsWith('video/') 
      ? `videos/${uniqueFileName}`
      : `files/${uniqueFileName}`;

    const command = new PutObjectCommand({
      Bucket: awsConfig.bucket,
      Key: fileKey,
      ContentType: fileType,
      ServerSideEncryption: 'AES256'
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
      signableHeaders: new Set(['content-type', 'host', 'x-amz-server-side-encryption'])
    });

    return NextResponse.json({
      success: true,
      uploadUrl,
      url: `${awsConfig.cloudfrontDomain}/${fileKey}`,
      fileKey
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
} 