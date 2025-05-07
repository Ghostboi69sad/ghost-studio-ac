import { ref, get } from 'firebase/database';

import { database } from './firebase';

export async function exportRealtimeDB(path: string = '/', filename: string = 'backup.json') {
  try {
    const response = await fetch('/api/backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'backup' }),
    });

    if (!response.ok) {
      throw new Error('فشل النسخ الاحتياطي');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('خطأ في تصدير البيانات:', error);
    throw error;
  }
}
