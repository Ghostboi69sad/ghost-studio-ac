import { Handler } from '@netlify/functions';
import { Stripe } from 'stripe';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

export const handler: Handler = async (event) => {
  console.log('Verify purchase function started');
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { sessionId } = JSON.parse(event.body || '{}');

    console.log('Received request with sessionId:', sessionId);

    if (!sessionId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Session ID is required' })
      };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });
    console.log('Retrieved session:', session.id);

    const isPurchaseValid = session.payment_status === 'paid';

    if (isPurchaseValid) {
      const lineItems = session.line_items?.data;
      if (lineItems && lineItems.length > 0) {
        const priceId = lineItems[0].price?.id;
        
        if (priceId) {
          const price = await stripe.prices.retrieve(priceId);
          const courseId = price.metadata.courseId;
          const userId = session.client_reference_id;

          if (courseId && userId) {
            // Update purchase status in Firebase
            const purchaseRef = ref(db, `purchases/${userId}/${courseId}`);
            await update(purchaseRef, {
              priceId,
              purchasedAt: new Date().toISOString(),
              status: 'completed',
              paymentMethod: 'stripe',
              amount: price.unit_amount ? price.unit_amount / 100 : 0,
              currency: price.currency
            });
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        isPurchaseValid,
        paymentStatus: session.payment_status,
        mode: session.mode,
        paymentMethod: 'stripe'
      }),
    };
  } catch (error) {
    console.error('Detailed error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to verify purchase', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
