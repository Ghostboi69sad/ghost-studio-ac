/* eslint-disable import/order */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */

import Stripe from 'stripe';
import { ref, set, get } from 'firebase/database';
import { NextResponse } from 'next/server';

import { database } from '../../../lib/firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
});



interface CreateSessionRequest {
  priceId: string;
  userId: string;
  type?: 'course' | 'subscription';
}

export async function POST(request: Request) {
  try {
    const {
      priceId,
      userId,
      type = 'subscription',
    } = (await request.json()) as CreateSessionRequest;

    const transactionId = `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isSubscription = type === 'subscription';

    // حفظ معلومات المعاملة
    const transactionRef = ref(database, `transactions/${transactionId}`);
    await set(transactionRef, {
      priceId,
      userId,
      type,
      status: 'pending',
      paymentMethod: 'stripe',
      createdAt: new Date().toISOString(),
    });

    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?transactionId=${transactionId}&type=${type}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?transactionId=${transactionId}`,
      metadata: {
        userId,
        transactionId,
        priceId,
        type,
      },
    });

    return NextResponse.json({
      orderId: session.id,
      approvalUrl: session.url!,
      transactionId,
    });
  } catch (error) {
    console.error('خطأ في إنشاء جلسة Stripe:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'فشل في إنشاء جلسة الدفع' },
      { status: 500 }
    );
  }
}
