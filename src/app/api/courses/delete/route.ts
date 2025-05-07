import { ref, remove, get } from 'firebase/database';
import { NextResponse } from 'next/server';

import { database } from '../../../../lib/firebase';
import { isAdminUser } from '../../../lib/auth-helpers';

export async function DELETE(request: Request) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    const { courseId, userId } = await request.json();

    // التحقق من صلاحيات المستخدم
    if (!userId || !(await isAdminUser(userId))) {
      return new Response(JSON.stringify({ error: 'غير مصرح لك بحذف الدورات' }), {
        status: 403,
        headers,
      });
    }

    // التحقق من وجود الدورة
    const courseRef = ref(database, `courses/${courseId}`);
    const courseSnapshot = await get(courseRef);

    if (!courseSnapshot.exists()) {
      return new Response(JSON.stringify({ error: 'الدورة غير موجودة' }), {
        status: 404,
        headers,
      });
    }

    // حذف الدورة
    await remove(courseRef);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم حذف الدورة بنجاح',
      }),
      {
        headers,
      }
    );
  } catch (error) {
    console.error('خطأ في حذف الدورة:', error);
    return new Response(
      JSON.stringify({
        error: 'حدث خطأ أثناء حذف الدورة',
      }),
      {
        status: 500,
        headers,
      }
    );
  }
}

// إضافة معالجة طلب OPTIONS للـ CORS
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
