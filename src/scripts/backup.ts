import { exportRealtimeDB } from '../lib/database-export';
import { importRealtimeDB } from '../lib/database-import';

// تصدير البيانات
async function backupDatabase() {
  try {
    await exportRealtimeDB('/courses', 'backups/courses.json');
    await exportRealtimeDB('/users', 'backups/users.json');
    await exportRealtimeDB('/progress', 'backups/progress.json');
    await exportRealtimeDB('/purchases', 'backups/purchases.json');

    console.log('تم النسخ الاحتياطي بنجاح');
  } catch (error) {
    console.error('خطأ في النسخ الاحتياطي:', error);
  }
}

// استيراد البيانات
async function restoreDatabase() {
  try {
    await importRealtimeDB('backups/courses.json', '/courses');
    await importRealtimeDB('backups/users.json', '/users');
    await importRealtimeDB('backups/progress.json', '/progress');
    await importRealtimeDB('backups/purchases.json', '/purchases');

    console.log('تم استعادة البيانات بنجاح');
  } catch (error) {
    console.error('خطأ في استعادة البيانات:', error);
  }
}

// تصدير الوظائف
export { backupDatabase, restoreDatabase };
