import { ref, set } from 'firebase/database';
import { NextResponse } from 'next/server';

import { database } from '../../../lib/firebase';

export async function POST(req: Request) {
  try {
    const { amount, courseId, userId } = await req.json();

    // إنشاء معرف فريد للمعاملة
    const transactionId = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // حفظ معلومات المعاملة في Firebase
    const transactionRef = ref(database, `transactions/${transactionId}`);
    await set(transactionRef, {
      courseId,
      userId,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    const response = await fetch(
      'https://api.sandbox.konnect.network/api/v2/payments/init-payment',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.FLOUCI_API_KEY!,
        },
        body: JSON.stringify({
          amount: amount,
          accept_card: 'true',
          session_timeout_secs: 1200,
          success_link: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?transactionId=${transactionId}`,
          fail_link: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failed?transactionId=${transactionId}`,
          developer_tracking_id: transactionId,
        }),
      }
    );

    const data = await response.json();
    return NextResponse.json({ paymentUrl: data.payUrl });
  } catch (error) {
    console.error('Flouci payment error:', error);
    return NextResponse.json({ error: 'فشل في إنشاء عملية الدفع' }, { status: 500 });
  }
}
