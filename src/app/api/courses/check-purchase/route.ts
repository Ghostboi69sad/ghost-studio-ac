import { NextResponse } from 'next/server';

import { getAuth, getDatabase, initAdmin } from '../../../../lib/firebase-admin';

export async function POST(request: Request) {
  try {
    initAdmin();
    const auth = getAuth();
    const db = getDatabase();
    const token = request.headers.get('authorization')?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const { courseId } = await request.json();
    const userId = decodedToken.uid;

    const purchaseRef = db.ref(`purchases/${userId}/${courseId}`);
    const snapshot = await purchaseRef.get();

    return NextResponse.json({
      purchased: snapshot.exists(),
      purchaseDetails: snapshot.val(),
    });
  } catch (error) {
    console.error('خطأ في التحقق من الشراء:', error);
    return NextResponse.json({ error: 'فشل التحقق من حالة الشراء' }, { status: 500 });
  }
}
