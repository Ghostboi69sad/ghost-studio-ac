import { NextResponse } from 'next/server';
import { database } from '../../../lib/firebase';
import { ref, get, update } from 'firebase/database';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16'
});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // التحقق من حالة الدفع
    const isPurchaseValid = session.payment_status === 'paid';
    
    if (isPurchaseValid) {
      const lineItems = session.line_items?.data;
      if (lineItems && lineItems.length > 0) {
        const priceId = lineItems[0].price?.id;
        
        // الحصول على معرف الدورة من metadata
        const price = await stripe.prices.retrieve(priceId!);
        const courseId = price.metadata.courseId;
        const userId = session.client_reference_id;

        if (courseId && userId) {
          // تحديث حالة الشراء في Firebase
          const purchaseRef = ref(database, `purchases/${userId}/${courseId}`);
          await update(purchaseRef, {
            priceId,
            purchasedAt: new Date().toISOString(),
            status: 'completed'
          });
        }
      }
    }

    return NextResponse.json({
      isPurchaseValid,
      paymentStatus: session.payment_status,
      mode: session.mode
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify purchase' },
      { status: 500 }
    );
  }
} 