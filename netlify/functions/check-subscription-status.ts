import { Handler } from '@netlify/functions';
import { getDatabase, ref, get } from 'firebase/database';
import { initializeApp } from 'firebase/app';
import Stripe from 'stripe';

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
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

interface SubscriptionData {
  status: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  planId?: string;
}

interface SubscriptionResponse {
  hasActiveSubscription: boolean;
  canAccessCourse: boolean;
  subscriptionDetails: {
    status: string;
    planId?: string;
    expirationDate?: string;
  } | null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, courseId } = JSON.parse(event.body || '{}');

    if (!userId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'User ID is required' })
      };
    }

    // التحقق من حالة الاشتراك في Firebase
    const userRef = ref(db, `users/${userId}/subscription`);
    const snapshot = await get(userRef);
    const subscriptionData: SubscriptionData = snapshot.exists() ? snapshot.val() : null;

    // التحقق من الدورة إذا تم تقديم معرف الدورة
    let courseAccess = true;
    if (courseId) {
      const courseRef = ref(db, `courses/${courseId}`);
      const courseSnapshot = await get(courseRef);
      const courseData = courseSnapshot.exists() ? courseSnapshot.val() : null;

      if (courseData?.isPremium) {
        // إذا كانت الدورة مميزة، تحقق من الاشتراك
        courseAccess = false;

        if (subscriptionData) {
          // التحقق من صلاحية الاشتراك
          const currentPeriodEnd = subscriptionData.currentPeriodEnd 
            ? new Date(subscriptionData.currentPeriodEnd) 
            : null;
          
          if (subscriptionData.status === 'active' && currentPeriodEnd && currentPeriodEnd > new Date()) {
            courseAccess = true;
          } else if (subscriptionData.stripeSubscriptionId) {
            // التحقق من Stripe مباشرة
            try {
              const subscription = await stripe.subscriptions.retrieve(subscriptionData.stripeSubscriptionId);
              courseAccess = subscription.status === 'active';
            } catch (error) {
              console.error('Error checking Stripe subscription:', error);
            }
          }
        }
      }
    }

    // تحضير الاستجابة
    const response: SubscriptionResponse = {
      hasActiveSubscription: false,
      canAccessCourse: courseAccess,
      subscriptionDetails: null
    };

    if (subscriptionData) {
      const currentPeriodEnd = subscriptionData.currentPeriodEnd 
        ? new Date(subscriptionData.currentPeriodEnd) 
        : null;

      response.hasActiveSubscription = Boolean(
        subscriptionData.status === 'active' && 
        currentPeriodEnd && 
        currentPeriodEnd > new Date()
      );

      response.subscriptionDetails = {
        status: subscriptionData.status,
        planId: subscriptionData.planId,
        expirationDate: subscriptionData.currentPeriodEnd,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers: {
        'Content-Type': 'application/json'
      }
    };

  } catch (error) {
    console.error('Error checking subscription status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to check subscription status',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
