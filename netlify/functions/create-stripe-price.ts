import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, courseId, courseName } = JSON.parse(event.body || '{}');

    const product = await stripe.products.create({
      name: courseName,
      metadata: {
        courseId,
        type: 'course',
        paymentType: 'one-time'
      }
    });

    const price = await stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: 'usd',
      product: product.id,
      metadata: {
        courseId,
        type: 'course',
        paymentType: 'one-time'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        priceId: price.id,
        productId: product.id
      })
    };
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create price' })
    };
  }
}; 