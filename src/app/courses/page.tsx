'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { CourseListingComponent } from '../components/course-listing/components/course-listing';

export default function CoursesPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className='min-h-screen'>
      <CourseListingComponent />
    </div>
  );
}
