'use client';

import CourseCreation2 from '../components/course-creation2';
import { v4 as uuidv4 } from 'uuid';
import { Course } from '../types/course';

export default function Page() {
  const initialCourse: Course = {
    id: uuidv4(),
    name: '',
    title: '',
    description: '',
    category: '',
    price: 0,
    subscriptionType: 'free',
    accessType: 'free',
    imageUrl: '',
    videoCount: 0,
    rating: 0,
    isPublic: false,
    thumbnail: '',
    instructor: '',
    duration: '0',
    level: 'beginner',
    enrolledStudents: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chapters: [
      {
        id: uuidv4(),
        title: 'Chapter 1',
        order: 1,
        content: [],
        lessons: [],
      },
    ],
  };

  const handleSave = async (course: Course) => {
    try {
      // يمكنك إضافة منطق الحفظ هنا
      console.log('Saving course:', course);
    } catch (error) {
      console.error('Error saving course:', error);
    }
  };

  return <CourseCreation2 initialCourse={initialCourse} onSave={handleSave} readOnly={false} />;
}
