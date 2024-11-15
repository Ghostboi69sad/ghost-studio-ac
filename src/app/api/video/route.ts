import { NextResponse } from 'next/server';
import { getMediaUrl } from '../../lib/aws/cloudfront-config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
  }

  try {
    const url = await getMediaUrl(key);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get video URL' }, { status: 500 });
  }
}
