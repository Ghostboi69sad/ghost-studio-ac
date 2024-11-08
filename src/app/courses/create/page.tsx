'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { CourseCreatorComponent } from '../../components/course-creator/components/course-creator';

export default function CreateCoursePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/courses');
      return;
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800'>
      <div className='container mx-auto p-8'>
        <CourseCreatorComponent />
      </div>
    </div>
  );
}
