'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { database, auth } from '../../../../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../../../lib/auth-context';
import { isAdminUser } from '../../../lib/auth-helpers';
import DomestikaCourseCreator from '../../../components/course-creator/components/domestika-creator';
import { Course } from '../../../components/course-creator/types/course';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export default function EditCoursePage() {
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.push('/login');
          return;
        }

        if (!isAdminUser(currentUser)) {
          toast.error('لا تملك الصلاحيات الكافية');
          router.push('/courses');
          return;
        }

        const courseRef = ref(database, `courses/${id}`);
        const unsubscribe = onValue(courseRef, (snapshot) => {
          setIsLoading(false);
          if (snapshot.exists()) {
            const data = snapshot.val();
            setCourse({ id: snapshot.key as string, ...data });
          } else {
            toast.error('الدورة غير موجودة');
            router.push('/courses');
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
        toast.error('حدث خطأ ما');
        router.push('/courses');
      }
    };

    checkAuth();
  }, [id, router]);

  const handleCourseUpdate = async (updatedCourse: Course) => {
    try {
      setIsLoading(true);

      if (!user || !isAdminUser(user)) {
        toast.error('لا تملك الصلاحيات الكافية');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedCourse),
      });

      if (!response.ok) {
        throw new Error('فشل تحديث الدورة');
      }

      toast.success('تم تحديث الدورة بنجاح');
      router.replace(`/courses/${id}`);
    } catch (error) {
      console.error('خطأ في تحديث الدورة:', error);
      toast.error('فشل تحديث الدورة');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-800'>
        <Loader2 className='w-8 h-8 animate-spin text-white' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-900 to-indigo-800'>
      {course ? (
        <DomestikaCourseCreator initialCourse={course} onSave={handleCourseUpdate} />
      ) : (
        <div className='flex items-center justify-center h-full'>
          <div className='text-xl text-white'>الدورة غير موجودة</div>
        </div>
      )}
    </div>
  );
}
