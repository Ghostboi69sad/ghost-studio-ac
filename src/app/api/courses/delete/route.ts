import { NextResponse } from 'next/server';
import { database } from '../../../../lib/firebase';
import { ref, remove, get } from 'firebase/database';

export async function DELETE(request: Request) {
  try {
    const { courseId, userId } = await request.json();

    // Check user permissions
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const userData = userSnapshot.val();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the course
    const courseRef = ref(database, `courses/${courseId}`);
    await remove(courseRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
