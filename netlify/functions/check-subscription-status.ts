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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

interface SubscriptionData {
  status: string;
  currentPeriodEnd: string;
  stripeSubscriptionId?: string;
  planId?: string;
}

interface SubscriptionResponse {
  isValid: boolean;
  courseAccess: boolean;
  subscriptionStatus?: string;
  expiryDate?: string;
  subscriptionDetails?: {
    planId: string;
    status: string;
    currentPeriodEnd: string;
  };
  error?: string;
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
        body: JSON.stringify({ 
          error: 'User ID is required',
          isValid: false,
          courseAccess: false 
        } as SubscriptionResponse)
      };
    }

    const response: SubscriptionResponse = {
      isValid: false,
      courseAccess: true
    };

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
              if (subscription.status === 'active') {
                courseAccess = true;
                response.subscriptionDetails = {
                  planId: subscription.items.data[0].price.id,
                  status: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
                };
              }
            } catch (error) {
              console.error('Error checking Stripe subscription:', error);
            }
          }
        }
      }
    }

    if (subscriptionData) {
      const currentPeriodEnd = subscriptionData.currentPeriodEnd 
        ? new Date(subscriptionData.currentPeriodEnd) 
        : null;

      response.isValid = Boolean(
        subscriptionData.status === 'active' && 
        currentPeriodEnd && 
        currentPeriodEnd > new Date()
      );

      response.subscriptionStatus = subscriptionData.status;
      response.expiryDate = subscriptionData.currentPeriodEnd;
    }

    response.courseAccess = courseAccess;

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Subscription check error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        isValid: false,
        courseAccess: false
      } as SubscriptionResponse)
    };
  }
};
