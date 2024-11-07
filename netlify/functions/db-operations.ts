import { Handler } from '@netlify/functions';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { operation, data } = JSON.parse(event.body || '{}');

  try {
    switch (operation) {
      case 'storeSubscription': {
        const { userId, subscriptionId, status, planType } = data;
        const subscriptionRef = ref(db, `users/${userId}/subscription`);
        
        await set(subscriptionRef, {
          subscriptionId,
          status,
          planType,
          createdAt: Date.now(),
          expirationDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
          active: true
        });

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Subscription stored successfully' })
        };
      }

      case 'checkSubscription': {
        const { userId } = data;
        const subscriptionRef = ref(db, `users/${userId}/subscription`);
        const snapshot = await get(subscriptionRef);

        if (!snapshot.exists()) {
          return {
            statusCode: 404,
            body: JSON.stringify({ hasActiveSubscription: false })
          };
        }

        const subscriptionData = snapshot.val();
        const isActive = subscriptionData.active && subscriptionData.expirationDate > Date.now();

        return {
          statusCode: 200,
          body: JSON.stringify({
            hasActiveSubscription: isActive,
            subscriptionType: subscriptionData.planType,
            expirationDate: new Date(subscriptionData.expirationDate).toISOString()
          })
        };
      }

      case 'updateSubscription': {
        const { userId, status } = data;
        const subscriptionRef = ref(db, `users/${userId}/subscription`);
        
        await set(subscriptionRef, {
          status,
          updatedAt: Date.now(),
          active: status === 'active'
        });

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Subscription updated successfully' })
        };
      }

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid operation' })
        };
    }
  } catch (error) {
    console.error('Database operation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Database operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
