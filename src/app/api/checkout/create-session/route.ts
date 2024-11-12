import { NextResponse } from 'next/server';
import { paypalClient } from '../../../../lib/paypal-config';
import { orders } from '@paypal/checkout-server-sdk';
import { initAdmin } from '../../../../lib/firebase-admin';
import { database } from '../../../lib/firebase';
import { ref, set , get } from 'firebase/database';

interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

export async function POST(request: Request) {
  try {
    const { courseId, userId, amount, type = 'course' } = await request.json();

    // التحقق من نوع الدورة
    const courseRef = ref(database, `courses/${courseId}`);
    const courseSnapshot = await get(courseRef);
    const course = courseSnapshot.val();

    if (!course) {
      throw new Error('Course not found');
    }

    const transactionId = `pp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isSubscription = course.accessType === 'subscription';

    // حفظ معلومات المعاملة
    const transactionRef = ref(database, `transactions/${transactionId}`);
    await set(transactionRef, {
      courseId,
      userId,
      amount,
      type: isSubscription ? 'subscription' : 'course',
      status: 'pending',
      paymentMethod: 'paypal',
      createdAt: new Date().toISOString(),
    });

    const orderRequest = new orders.OrdersCreateRequest();
    orderRequest.prefer("return=representation");
    orderRequest.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toString()
        },
        custom_id: `${transactionId}:${type}`,
        description: isSubscription ? 
          `Subscription: ${course.title}` : 
          `Course Purchase: ${course.title}`
      }],
      application_context: {
        brand_name: 'Ghost Studio',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?transactionId=${transactionId}&courseId=${courseId}&type=${type}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?transactionId=${transactionId}`
      }
    });

    const response = await paypalClient.execute(orderRequest);
    const approveLink = (response.result.links as PayPalLink[]).find(
      (link: PayPalLink) => link.rel === 'approve'
    );

    if (!approveLink || !approveLink.href) {
      throw new Error('PayPal approval URL not found');
    }
    
    return NextResponse.json({ 
      orderId: response.result.id,
      approvalUrl: approveLink.href,
      transactionId
    });

  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return NextResponse.json({ error: 'فشل في إنشاء طلب الدفع' }, { status: 500 });
  }
}