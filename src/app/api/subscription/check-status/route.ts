import { NextResponse } from 'next/server';
import { initAdmin } from '../../../../lib/firebase-admin';

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

    const userRecord = await auth.getUser(userId);
    const isAdmin = userRecord.customClaims?.admin === true;

    if (isAdmin) {
      return NextResponse.json({
        isValid: true,
        courseAccess: true,
        subscriptionStatus: 'admin',
        role: 'admin'
      });
    }

    const response = {
      isValid: false,
      courseAccess: false,
      subscriptionStatus: '',
      expiryDate: '',
      subscriptionDetails: null as any,
      role: 'user'
    };

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

    const purchaseRef = db.ref(`users/${userId}/purchases/${courseId}`);
    const purchaseSnapshot = await purchaseRef.once('value');
    const hasPurchased = purchaseSnapshot.exists();

    if (hasPurchased) {
      return NextResponse.json({
        isValid: true,
        courseAccess: true,
        subscriptionStatus: 'purchased'
      });
    }

    if (courseData.accessType === 'free') {
      return NextResponse.json({
        isValid: true,
        courseAccess: true,
        subscriptionStatus: 'free'
      });
    }

    const userRef = db.ref(`users/${userId}/subscription`);
    const subscriptionSnapshot = await userRef.once('value');
    const subscriptionData = subscriptionSnapshot.val();

    if (courseData.accessType === 'subscription' && subscriptionData?.paypalSubscriptionId) {
      try {
        const subscriptionStatus = subscriptionData.status;
        response.courseAccess = subscriptionStatus === 'active';
        
        if (subscriptionStatus === 'active') {
          response.subscriptionDetails = {
            planId: subscriptionData.planId,
            status: subscriptionStatus,
            currentPeriodEnd: subscriptionData.currentPeriodEnd,
            subscriptionType: 'subscription'
          };
        }
      } catch (error) {
        console.error('PayPal subscription check error:', error);
      }
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