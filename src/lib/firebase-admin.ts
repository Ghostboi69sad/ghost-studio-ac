import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

interface AdminServices {
  auth: ReturnType<typeof getAuth>;
  db: ReturnType<typeof getDatabase>;
}

export function initAdmin(): AdminServices {
  if (!getApps().length) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      if (!privateKey) {
        throw new Error('مفتاح Firebase الخاص مفقود');
      }

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      });
      
    } catch (error) {
      console.error('خطأ في تهيئة Firebase Admin:', error);
      throw error;
    }
  }

  return {
    auth: getAuth(),
    db: getDatabase()
  };
}

export { getAuth, getDatabase };