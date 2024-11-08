import { backupDatabase, restoreDatabase } from './backup';

// وظيفة لتشغيل النسخ الاحتياطي
export async function runBackup() {
  try {
    await backupDatabase();
    console.log('تم النسخ الاحتياطي بنجاح');
  } catch (error) {
    console.error('خطأ في النسخ الاحتياطي:', error);
  }
}

// وظيفة لتشغيل الاستعادة
export async function runRestore() {
  try {
    await restoreDatabase();
    console.log('تم استعادة البيانات بنجاح');
  } catch (error) {
    console.error('خطأ في استعادة البيانات:', error);
  }
}
