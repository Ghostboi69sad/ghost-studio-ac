import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { database } from '../../../lib/firebase';
import { ref, get } from 'firebase/database';

// تعريف نوع Course
interface Course {
  id: string;
  title: string;
  description?: string;
  accessType: 'free' | 'paid' | 'subscription';
  isPublic: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  chapters?: Array<{
    id: string;
    title: string;
    order: number;
    content: Array<{
      id: string;
      type: 'video' | 'file';
      name: string;
      url: string;
    }>;
  }>;
}

async function fetchCourses(userId: string): Promise<Course[]> {
  const coursesRef = ref(database, 'courses');
  const snapshot = await get(coursesRef);

  if (!snapshot.exists()) {
    return [];
  }

  const courses: Course[] = [];
  snapshot.forEach((childSnapshot) => {
    const course = {
      id: childSnapshot.key,
      ...childSnapshot.val(),
    } as Course;

    if (course.isPublic || course.createdBy === userId) {
      courses.push(course);
    }
  });

  return courses;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });

  try {
    const userId = request.headers.get('user-id');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), { 
        status: 401, 
        headers 
      });
    }

    const courses = await fetchCourses(userId);
    return new Response(JSON.stringify(courses), { headers });
  } catch (error) {
    console.error('خطأ في جلب الدورات:', error);
    return new Response(JSON.stringify({ error: 'فشل في جلب البيانات' }), { 
      status: 500, 
      headers 
    });
  }
}
