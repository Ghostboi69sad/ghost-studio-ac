import { NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

export async function POST(request: Request) {
  try {
    const { auth, db } = initAdmin();
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    
    if (!token) {
      return NextResponse.json({ 
        error: 'No authorization token',
        isValid: false,
        courseAccess: false 
      }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const { courseId } = await request.json();
    const userId = decodedToken.uid;

    const response = {
      isValid: false,
      courseAccess: false,
      subscriptionStatus: '',
      expiryDate: '',
      subscriptionDetails: null as any
    };

    // التحقق من الدورة
    const courseRef = db.ref(`courses/${courseId}`);
    const courseSnapshot = await courseRef.once('value');
    const courseData = courseSnapshot.val();

    if (!courseData) {
      return NextResponse.json({ 
        error: 'Course not found',
        isValid: false,
        courseAccess: false 
      }, { status: 404 });
    }

    // التحقق من الاشتراك
    const userRef = db.ref(`users/${userId}/subscription`);
    const subscriptionSnapshot = await userRef.once('value');
    const subscriptionData = subscriptionSnapshot.val();

    if (courseData.accessType === 'subscription') {
      if (subscriptionData?.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionData.stripeSubscriptionId);
          response.courseAccess = subscription.status === 'active';
          
          if (subscription.status === 'active') {
            await userRef.update({
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              updatedAt: new Date().toISOString(),
              planId: subscription.items.data[0].price.id
            });

            response.subscriptionDetails = {
              planId: subscription.items.data[0].price.id,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
              subscriptionType: 'subscription',
              accessType: 'subscription',
              stripeSubscriptionId: subscription.id
            };
          }
        } catch (error) {
          console.error('Stripe subscription check error:', error);
        }
      }
    } else {
      response.courseAccess = true; // للدورات المجانية
    }

    response.isValid = response.courseAccess;
    return NextResponse.json(response);

  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
      isValid: false,
      courseAccess: false
    }, { status: 500 });
  }
}