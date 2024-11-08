import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Explicitly set the region
const REGION = 'eu-north-1'; // Match your bucket's region
const BUCKET_NAME = process.env.MY_AWS_S3_BUCKET || 'ghost-studio';

export const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(file: File, key: string) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);
    return `${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${key}`;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function uploadIndexFile() {
  const indexHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ghost Studio Academy</title>
        <link rel="stylesheet" href="/css/style.css">
      </head>
      <body>
        <div id="root"></div>
        <script src="/js/main.js"></script>
      </body>
    </html>
  `;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: 'index.html',
    Body: Buffer.from(indexHtml),
    ContentType: 'text/html',
  });

  await s3Client.send(command);
}

export async function uploadInitialFiles() {
  // Upload index.html
  const indexHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ghost Studio Academy</title>
        <link rel="stylesheet" href="/css/style.css">
      </head>
      <body>
        <div id="root"></div>
        <script src="/js/main.js"></script>
      </body>
    </html>
  `;

  // Upload style.css
  const css = `
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
    }
  `;

  // Upload main.js
  const js = `
    console.log('Ghost Studio Academy');
  `;

  const files = [
    { key: 'index.html', content: indexHtml, type: 'text/html' },
    { key: 'css/style.css', content: css, type: 'text/css' },
    { key: 'js/main.js', content: js, type: 'application/javascript' },
  ];

  for (const file of files) {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.key,
      Body: Buffer.from(file.content),
      ContentType: file.type,
    });

    await s3Client.send(command);
  }
}
