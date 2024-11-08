import { database } from './firebase';
import { ref, get } from 'firebase/database';
import * as fs from 'fs';

export async function exportRealtimeDB(path: string = '/', filename: string = 'backup.json') {
  try {
    const dbRef = ref(database, path);
    const snapshot = await get(dbRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const jsonString = JSON.stringify(data, null, 2);

      fs.writeFileSync(filename, jsonString);
      console.log('تم تصدير البيانات بنجاح إلى:', filename);
      return data;
    } else {
      console.log('لا توجد بيانات في المسار المحدد');
      return null;
    }
  } catch (error) {
    console.error('خطأ في تصدير البيانات:', error);
    throw error;
  }
}
