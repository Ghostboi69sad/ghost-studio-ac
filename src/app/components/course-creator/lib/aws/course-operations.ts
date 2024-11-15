import { ref, update as firebaseUpdate } from 'firebase/database';
import { database } from '../../../../lib/firebase';
import { Course, CourseUpdate } from '../../types/course';

/**
 * Saves course metadata to Firebase while optimizing storage usage
 * @param course - The complete course object
 * @param update - The update data to be saved
 */
export async function saveCourseToDatabase(course: Course, update: CourseUpdate) {
  // Store only metadata in Firebase to reduce database size and costs
  const metadata = {
    id: course.id,
    title: course.title,
    description: course.description,
    accessType: update.accessType,
    isPublic: update.isPublic,
    // Map chapters to store minimal data
    chapters: course.chapters?.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      // Store only content keys instead of full URLs
      content: chapter.content.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        key: item.url.split('/').pop(),
      })),
    })),
    updatedAt: update.updatedAt,
    updatedBy: update.updatedBy,
  };

  const courseRef = ref(database, `courses/${course.id}`);
  await firebaseUpdate(courseRef, metadata);
}
