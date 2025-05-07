import { ref, update, get } from 'firebase/database';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { database } from '../../../lib/firebase';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const eventType = payload.event_type;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const [transactionId, type] = payload.resource.custom_id.split(':');

      // جلب معلومات المعاملة
      const transactionRef = ref(database, `transactions/${transactionId}`);
      const transactionSnapshot = await get(transactionRef);
      const transaction = transactionSnapshot.val();

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const { userId, courseId } = transaction;

      if (type === 'subscription') {
        // تحديث الاشتراك
        const subscriptionRef = ref(database, `subscriptions/${userId}`);
        await update(subscriptionRef, {
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          type: 'premium',
          paymentId: transactionId,
        });
      } else {
        // تحديث شراء الدورة
        const purchaseRef = ref(database, `purchases/${userId}/${courseId}`);
        await update(purchaseRef, {
          purchasedAt: new Date().toISOString(),
          amount: payload.resource.amount.value,
          paymentMethod: 'paypal',
          transactionId,
        });
      }

      // تحديث حالة المعاملة
      await update(transactionRef, {
        status: 'completed',
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
