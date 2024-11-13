import { NextResponse } from 'next/server';
import { database } from '../../../lib/firebase';
import { ref, update } from 'firebase/database';

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();
    
    // تحديث حالة المعاملة
    const transactionRef = ref(database, `transactions/${transactionId}`);
    await update(transactionRef, {
      status: 'completed',
      updatedAt: new Date().toISOString()
    });

    // إضافة الدورة إلى مشتريات المستخدم
    // ... كود إضافة المشتريات ...

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('خطأ في التحقق من الدفع:', error);
    return NextResponse.json(
      { error: 'فشل في التحقق من الدفع' },
      { status: 500 }
    );
  }
} 