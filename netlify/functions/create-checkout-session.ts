import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { getDatabase, ref, set } from 'firebase/database';
import { initializeApp } from 'firebase/app';

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

const DOMAIN = process.env.NEXT_PUBLIC_BASE_URL;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { priceId, userId, domain, mode } = JSON.parse(event.body || '{}');

  if (!priceId || !userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' })
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: mode || 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/canceled`,
      client_reference_id: userId,
    });

    // Store the checkout session in Realtime Database
    const sessionRef = ref(db, `checkoutSessions/${session.id}`);
    await set(sessionRef, {
      userId,
      status: 'pending',
      createdAt: Date.now(),
      mode: mode || 'subscription'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
