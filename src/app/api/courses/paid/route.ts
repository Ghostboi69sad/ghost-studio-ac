import { getAuth } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { NextResponse } from 'next/server';

import { database } from '../../../../lib/firebase';
import { Course } from '../../../components/course-listing/types/course';

export const dynamic = 'force-dynamic';

async function fetchPaidCourses(): Promise<Course[]> {
  console.log('بدء جلب الدورات المدفوعة');
  const coursesRef = ref(database, 'courses');
  const snapshot = await get(coursesRef);

  console.log('هل توجد بيانات؟', snapshot.exists());
  if (!snapshot.exists()) {
    return [];
  }

  const courses: Course[] = [];
  snapshot.forEach(childSnapshot => {
    const courseData = childSnapshot.val();
    console.log('بيانات الدورة:', courseData);
    console.log('نوع الوصول:', courseData.accessType);

    if (courseData.accessType === 'paid' || courseData.accessType === 'subscription') {
      courses.push({
        id: childSnapshot.key as string,
        ...courseData,
      });
    }
  });

  console.log('عدد الدورات المدفوعة:', courses.length);
  return courses;
}

export async function GET(request: Request) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'غير مصرح' }), {
        status: 401,
        headers,
      });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const courses = await fetchPaidCourses();
      return new Response(JSON.stringify({ courses }), { headers });
    } catch (error) {
      console.error('خطأ في جلب الدورات:', error);
      return new Response(JSON.stringify({ error: 'فشل في جلب البيانات' }), {
        status: 500,
        headers,
      });
    }
  } catch (error) {
    console.error('خطأ عام:', error);
    return new Response(JSON.stringify({ error: 'خطأ في الخادم' }), {
      status: 500,
      headers,
    });
  }
}
