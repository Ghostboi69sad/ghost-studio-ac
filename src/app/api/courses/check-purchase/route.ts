import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { initAdmin } from '../../../../lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { auth } = initAdmin();
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const { courseId } = await request.json();
    const userId = decodedToken.uid;

    const purchaseRef = ref(database, `purchases/${userId}/${courseId}`);
    const snapshot = await get(purchaseRef);

    return NextResponse.json({ 
      purchased: snapshot.exists(),
      purchaseDetails: snapshot.val()
    });
  } catch (error) {
    console.error('Error checking purchase:', error);
    return NextResponse.json({ error: 'Failed to check purchase status' }, { status: 500 });
  }
} 