import { NextResponse } from 'next/server';
import { paypalClient } from '../../../../lib/paypal-config';
import paypal from '@paypal/checkout-server-sdk';
const { orders } = paypal;
import { database } from '../../../lib/firebase';
import { ref, set, get } from 'firebase/database';

interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

interface CreateSessionRequest {
  courseId: string;
  userId: string;
  amount: number;
  type?: 'course' | 'subscription';
}

export async function POST(request: Request) {
  try {
    const {
      courseId,
      userId,
      amount,
      type = 'course',
    } = (await request.json()) as CreateSessionRequest;

    // التحقق من وجود الدورة
    const courseRef = ref(database, `courses/${courseId}`);
    const courseSnapshot = await get(courseRef);
    const course = courseSnapshot.val();

    if (!course) {
      return NextResponse.json({ error: 'الدورة غير موجودة' }, { status: 404 });
    }

    // التحقق من صحة المبلغ
    if (amount <= 0 || isNaN(amount)) {
      return NextResponse.json({ error: 'مبلغ غير صالح' }, { status: 400 });
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
      courseName: course.title,
      courseType: course.accessType,
    });

    const orderRequest = new orders.OrdersCreateRequest();
    orderRequest.prefer('return=representation');
    orderRequest.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount.toString(),
          },
          custom_id: `${transactionId}:${type}`,
          description: isSubscription ? `اشتراك في: ${course.title}` : `شراء دورة: ${course.title}`,
        },
      ],
      application_context: {
        brand_name: 'Ghost Studio Academy',
        landing_page: 'LOGIN',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?transactionId=${transactionId}&courseId=${courseId}&type=${type}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failed?transactionId=${transactionId}`,
      },
    });

    const response = await paypalClient.execute<paypal.PayPalOrderResponse>(orderRequest);
    const approveLink = (response.result.links as PayPalLink[]).find(
      (link: PayPalLink) => link.rel === 'approve'
    );

    if (!approveLink?.href) {
      throw new Error('رابط الموافقة من PayPal غير موجود');
    }

    return NextResponse.json({
      orderId: response.result.id,
      approvalUrl: approveLink.href,
      transactionId,
    });
  } catch (error) {
    console.error('خطأ في إنشاء طلب PayPal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'فشل في إنشاء طلب الدفع' },
      { status: 500 }
    );
  }
}
