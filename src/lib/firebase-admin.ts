import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error('متغيرات Firebase البيئية مفقودة أو غير صحيحة');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        projectId: process.env.FIREBASE_PROJECT_ID,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    
    console.log('تم تهيئة Firebase Admin بنجاح');
  } catch (error) {
    console.error('خطأ في تهيئة Firebase Admin:', error);
    throw error;
  }
}

export const auth = admin.auth();
export const db = admin.database();

export function initAdmin() {
  return { auth, db };
}