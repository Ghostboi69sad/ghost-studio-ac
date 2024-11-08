import { NextResponse } from 'next/server';
import { uploadInitialFiles } from '../../../lib/s3';

export async function POST() {
  try {
    await uploadInitialFiles();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error initializing files:', error);
    return NextResponse.json({ error: 'Failed to initialize files' }, { status: 500 });
  }
}
