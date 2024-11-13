'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { CourseListingComponent } from '../components/course-listing/components/course-listing';
import { PaidCoursesListing } from '../components/course-listing/components/paid-courses-listing';
import { Loader2, CreditCard, Edit } from 'lucide-react';
import { Course } from '../components/course-creator/types/course';
import { Button } from '../components/course-listing/components/ui/button'

export default function CoursesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaidCourses, setShowPaidCourses] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchCourses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/courses`, {
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
    <div className='min-h-screen bg-black'>
      <div className="flex justify-end gap-4 p-4 bg-black">
        <Button
          onClick={() => setShowPaidCourses(!showPaidCourses)}
          variant="outline"
          className="flex items-center gap-2 bg-transparent border-amber-400 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 transition-colors duration-200"
        >
          <CreditCard className="h-4 w-4" />
          {showPaidCourses ? 'All Courses' : 'VIP Courses'}
        </Button>
      </div>
      
      {showPaidCourses ? <PaidCoursesListing /> : <CourseListingComponent />}
    </div>
  );
}
