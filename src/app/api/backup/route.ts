import { NextResponse } from 'next/server';
import { database } from '../../../lib/firebase';
import { ref, get, set } from 'firebase/database';

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (action === 'backup') {
      // جلب البيانات من Firebase
      const paths = ['/courses', '/users', '/progress', '/purchases'];
      const backupData: Record<string, any> = {};

      for (const path of paths) {
        const snapshot = await get(ref(database, path));
        if (snapshot.exists()) {
          backupData[path.slice(1)] = snapshot.val();
        }
      }

      return NextResponse.json(backupData);
    }

    if (action === 'restore') {
      const data = await request.json();

      // استعادة البيانات إلى Firebase
      for (const [path, value] of Object.entries(data)) {
        await set(ref(database, `/${path}`), value);
      }

      return NextResponse.json({ message: 'تم استعادة البيانات بنجاح' });
    }

    return NextResponse.json({ error: 'إجراء غير صالح' }, { status: 400 });
  } catch (error: any) {
    console.error('خطأ في النسخ الاحتياطي:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
