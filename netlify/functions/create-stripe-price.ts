import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { amount, courseId, courseName } = JSON.parse(event.body || '');

    const price = await stripe.prices.create({
      unit_amount: amount * 100,
      currency: 'usd',
      product_data: {
        name: courseName,
        metadata: {
          courseId
        }
      },
      metadata: {
        courseId
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ priceId: price.id })
    };
  } catch (error) {
    console.error('Error creating price:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create price' })
    };
  }
}; 