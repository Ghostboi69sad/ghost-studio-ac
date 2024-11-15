import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase';
import { ref, set } from 'firebase/database';

export async function POST(request: Request) {
  const { userId, courseId, lessonId, progress } = await request.json();

  try {
    await set(ref(database, `progress/${userId}/${courseId}/${lessonId}`), {
      progress,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
