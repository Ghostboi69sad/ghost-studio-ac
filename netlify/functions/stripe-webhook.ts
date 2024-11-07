import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update, increment } from 'firebase/database';

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
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing request body' })
    };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing signature or webhook secret' })
    };
  }

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'payment') {
          // Handle one-time course purchase
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            const courseId = price.metadata.courseId;
            const userId = session.client_reference_id;

            if (courseId && userId) {
              const purchaseRef = ref(db, `purchases/${userId}/${courseId}`);
              await update(purchaseRef, {
                priceId,
                purchasedAt: new Date().toISOString(),
                status: 'completed',
                paymentMethod: 'stripe',
                amount: price.unit_amount ? price.unit_amount / 100 : 0,
                currency: price.currency,
                paymentType: price.metadata.paymentType || 'one-time'
              });

              // Update course stats
              const courseRef = ref(db, `courses/${courseId}`);
              await update(courseRef, {
                enrolledStudents: increment(1)
              });
            }
          }
        } else if (session.mode === 'subscription') {
          // Handle subscription purchase
          // This is handled by subscription webhook handlers
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Additional payment success handling if needed
        break;
      }

      case 'payment_intent.payment_failed': {
        // Handle failed payments
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id);
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error('Webhook error:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook Error' })
    };
  }
}; 