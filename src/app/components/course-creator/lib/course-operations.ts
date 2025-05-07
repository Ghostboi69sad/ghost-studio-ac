import { ref, update } from 'firebase/database';
import { toast } from 'react-hot-toast';

import { database } from '../../../lib/firebase';
import { Course } from '../types/course';

export async function saveCourseToDatabase(
  course: Course,
  updatedFields: Partial<Course>
): Promise<void> {
  try {
    const courseRef = ref(database, `courses/${course.id}`);
    const simplifiedChapters = updatedFields.chapters?.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content.map(item => ({
        id: item.id,
        type: item.type,
        name: item.name,
        url: item.url,
      })),
    }));

    const updates = {
      accessType: updatedFields.accessType,
      isPublic: updatedFields.isPublic,
      chapters: simplifiedChapters || [],
      updatedAt: new Date().toISOString(),
      updatedBy: updatedFields.updatedBy,
    };

    await update(courseRef, updates);
    toast.success('تم حفظ الدورة بنجاح');
  } catch (error) {
    console.error('خطأ في حفظ الدورة:', error);
    toast.error('فشل في حفظ الدورة');
    throw error;
  }
}
