'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

import CourseCreator2 from '../../components/course-creator/components/course-creation2';
import { saveCourseToDatabase } from '../../components/course-creator/lib/course-operations';
import { Course } from '../../components/course-creator/types/course';
import { useAuth } from '../../lib/auth-context';

export default function CreateCoursePage() {
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

  const handleSave = async (course: Course): Promise<void> => {
    try {
      await saveCourseToDatabase(course, {
        accessType: course.accessType,
        isPublic: course.isPublic,
        chapters: course.chapters,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || '',
      });
      toast.success('تم إنشاء الدورة بنجاح');
      router.push(`/courses/${course.id}`);
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('فشل في إنشاء الدورة');
    }
  };

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800'>
      <div className='container mx-auto p-8'>
        <CourseCreator2 initialCourse={initialCourse} onSave={handleSave} readOnly={false} />
      </div>
    </div>
  );
}
