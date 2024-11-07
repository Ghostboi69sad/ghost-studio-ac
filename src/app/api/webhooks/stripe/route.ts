import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { database } from '../../../../lib/firebase';
import { ref, update, increment } from 'firebase/database';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'payment') {
          // Handle one-time course purchase
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            const courseId = price.metadata.courseId;
            const userId = session.client_reference_id;

            if (courseId && userId) {
              // Update purchase record
              const purchaseRef = ref(database, `purchases/${userId}/${courseId}`);
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
              const courseRef = ref(database, `courses/${courseId}`);
              await update(courseRef, {
                enrolledStudents: increment(1)
              });
            }
          }
        } else if (session.mode === 'subscription') {
          // Handle subscription purchase
          const userId = session.client_reference_id;
          if (userId) {
            const subscriptionRef = ref(database, `users/${userId}/subscription`);
            await update(subscriptionRef, {
              status: 'active',
              planId: session.metadata?.planId,
              stripeSubscriptionId: session.subscription,
              startDate: new Date().toISOString(),
              currentPeriodEnd: session.metadata?.currentPeriodEnd,
              paymentMethod: 'stripe'
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        
        if (userId) {
          const subscriptionRef = ref(database, `users/${userId}/subscription`);
          await update(subscriptionRef, {
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end
          });
          console.log('Updated subscription status for user:', userId);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Additional payment success handling
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata.courseId && paymentIntent.metadata.userId) {
          const purchaseRef = ref(database, `purchases/${paymentIntent.metadata.userId}/${paymentIntent.metadata.courseId}`);
          await update(purchaseRef, {
            paymentIntentId: paymentIntent.id,
            paymentStatus: 'succeeded',
            updatedAt: new Date().toISOString()
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        // Handle failed payments
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata.courseId && paymentIntent.metadata.userId) {
          const purchaseRef = ref(database, `purchases/${paymentIntent.metadata.userId}/${paymentIntent.metadata.courseId}`);
          await update(purchaseRef, {
            paymentIntentId: paymentIntent.id,
            paymentStatus: 'failed',
            errorMessage: paymentIntent.last_payment_error?.message,
            updatedAt: new Date().toISOString()
          });
        }
        console.error('Payment failed:', paymentIntent.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
} 