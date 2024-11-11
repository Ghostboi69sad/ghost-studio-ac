'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { CourseListingComponent } from '../components/course-listing/components/course-listing';
import { Loader2 } from 'lucide-react';
import { Course } from '../components/course-creator/types/course';

export default function CoursesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses', {
          headers: {
            'user-id': user.uid,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('فشل في جلب الدورات');
        }

        const data = await response.json();
        setCourses(data);
      } catch (error) {
        console.error('خطأ في جلب الدورات:', error);
        setError('حدث خطأ أثناء جلب الدورات');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, router]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <CourseListingComponent />
    </div>
  );
}
