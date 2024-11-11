import { database } from './firebase';
import { ref, set } from 'firebase/database';

export async function importRealtimeDB(data: any, path: string): Promise<void> {
  try {
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'restore',
        data: data,
        path: path
      })
    });

    if (!response.ok) {
      throw new Error('فشل استعادة البيانات');
    }
  } catch (error) {
    console.error('خطأ في استيراد البيانات:', error);
    throw error;
  }
}
