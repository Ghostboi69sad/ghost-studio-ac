import { ref, get, update } from 'firebase/database';
import { NextResponse } from 'next/server';

import { database } from '../../../lib/firebase';

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();

    const transactionRef = ref(database, `transactions/${transactionId}`);
    const snapshot = await get(transactionRef);

    if (!snapshot.exists()) {
      throw new Error('Transaction not found');
    }

    const transaction = snapshot.val();

    await update(transactionRef, {
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });

    // تحديث حالة الشراء للمستخدم
    const purchaseRef = ref(database, `purchases/${transaction.userId}/${transaction.courseId}`);
    await update(purchaseRef, {
      purchasedAt: new Date().toISOString(),
      amount: transaction.amount,
      paymentMethod: 'flouci',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'فشل في التحقق من الدفع' }, { status: 500 });
  }
}
