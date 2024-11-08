import { database } from './firebase';
import { ref, set } from 'firebase/database';
import * as fs from 'fs';

export async function importRealtimeDB(filename: string, path: string = '/') {
  try {
    const jsonString = fs.readFileSync(filename, 'utf8');
    const data = JSON.parse(jsonString);

    const dbRef = ref(database, path);
    await set(dbRef, data);

    console.log('تم استيراد البيانات بنجاح إلى:', path);
  } catch (error) {
    console.error('خطأ في استيراد البيانات:', error);
    throw error;
  }
}
