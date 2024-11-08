import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { adminConfig } from '../../lib/firebase-config';

const initAdmin = () => {
  if (!getApps().length) {
    return initializeApp({
      credential: cert(adminConfig.credential),
      databaseURL: adminConfig.databaseURL,
    });
  }
  return getApps()[0];
};

export async function middleware(request: NextRequest) {
  try {
    const adminApp = initAdmin();
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('توكن غير صالح');
    }

    const token = authHeader.split(' ')[1];
    const adminAuth = getAuth(adminApp);
    const decodedToken = await adminAuth.verifyIdToken(token);

    const db = getDatabase(adminApp);
    const userRef = db.ref(`users/${decodedToken.uid}`);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists()) {
      throw new Error('المستخدم غير موجود');
    }

    const userData = userSnapshot.val();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decodedToken.uid);
    requestHeaders.set('x-user-role', userData.role || 'user');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error: any) {
    console.error('خطأ في المصادقة:', error);
    return new NextResponse(JSON.stringify({ error: error.message || 'خطأ في المصادقة' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// تكوين المسارات التي يجب حمايتها
export const config = {
  matcher: ['/api/courses/:path*', '/api/subscriptions/:path*', '/api/users/:path*'],
};
