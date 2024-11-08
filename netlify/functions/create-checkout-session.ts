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
    const { priceId, userId, courseId, paymentMethod, amount } = JSON.parse(event.body || '');

    const metadata = {
      courseId,
      userId,
      paymentMethod
    };

    if (paymentMethod === 'stripe') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.URL}/payment/cancel`,
        client_reference_id: userId,
        metadata
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ sessionId: session.id })
      };
    } 
    
    if (paymentMethod === 'flouci') {
      const transactionId = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('https://api.sandbox.konnect.network/api/v2/payments/init-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.FLOUCI_API_KEY!
        },
        body: JSON.stringify({
          amount,
          accept_card: true,
          session_timeout_secs: 1200,
          success_link: `${process.env.URL}/payment/success?transaction_id=${transactionId}`,
          fail_link: `${process.env.URL}/payment/cancel?transaction_id=${transactionId}`,
          developer_tracking_id: transactionId,
          metadata
        })
      });

      const data = await response.json();
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          paymentUrl: data.payUrl,
          transactionId 
        })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid payment method' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create payment session' })
    };
  }
};
