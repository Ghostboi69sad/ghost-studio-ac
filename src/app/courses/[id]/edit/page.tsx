'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { database } from '../../../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Loader2 } from 'lucide-react';
import { toast } from '../../../../lib/toast';
import DomestikaCourseCreator from '../../../components/course-creator/components/domestika-creator';
import { useSubscriptionStatus } from '../../../components/course-creator/hooks/use-subscription';
import { saveCourseToDatabase } from '../../../components/course-creator/lib/course-operations';
import type { Course } from '../../../components/course-creator/types/course';
import { getPresignedUploadUrl, getS3Url } from '../../../../lib/aws-config';

export default function EditCoursePage({ params: { id } }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const { hasSubscription, isLoading: subscriptionLoading } = useSubscriptionStatus();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const checkAccess = async () => {
      try {
        setLoading(true);
        // التحقق من صلاحيات المشرف
        if (user.role === 'admin') {
          const courseRef = ref(database, `courses/${id}`);
          const unsubscribe = onValue(courseRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              setCourse({ id: snapshot.key as string, ...data });
            } else {
              toast.error('الدورة غير موجودة');
              router.push('/courses');
            }
            setLoading(false);
          });

          return () => unsubscribe();
        }

        // التحقق من حالة الاشتراك للمستخدمين العاديين
        const response = await fetch('/api/subscription/check-status', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getIdToken()}`
          },
          body: JSON.stringify({
            courseId: id,
          }),
        });

        const data = await response.json();
        
        if (!data.courseAccess && !data.isValid) {
          toast.error('يجب أن يكون لديك اشتراك نشط للوصول إلى هذا المحتوى');
          router.push('/pricing-plan');
          return;
        }

        // جلب بيانات الدورة
        const courseRef = ref(database, `courses/${id}`);
        const unsubscribe = onValue(courseRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setCourse({ id: snapshot.key as string, ...data });
          } else {
            toast.error('الدورة غير موجودة');
            router.push('/courses');
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('خطأ في التحقق من الوصول:', error);
        toast.error('حدث خطأ في التحقق من صلاحيات الوصول');
        router.push('/courses');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, router, id]);

  const handleCourseUpdate = async (updatedCourse: Course) => {
    try {
      if (user?.role !== 'admin' && process.env.NODE_ENV !== 'development') {
        toast.error('غير مصرح لك بتحديث هذه الدورة');
        return;
      }

      const courseUpdate = {
        accessType: updatedCourse.accessType,
        isPublic: updatedCourse.isPublic,
        chapters: updatedCourse.chapters,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || '',
      };

      await saveCourseToDatabase(updatedCourse, courseUpdate);
      toast.success('تم تحديث الدورة بنجاح');
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('فشل تحديث الدورة');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const fileExtension = file.name.split('.').pop();
      const key = `courses/${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      // ال
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('فشل رفع الملف');
    }
  };

  // عرض حالة التحميل
  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
          <p className="text-lg">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // التحقق من الوصول
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isAdmin = user?.role === 'admin';
  
  if (!isDevelopment && !isAdmin && !hasSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="p-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">غير مصرح بالوصول</h2>
          <p className="text-yellow-800 dark:text-yellow-200 mb-4">
            يجب أن يكون لديك اشتراك نشط للوصول إلى هذا المحتوى
          </p>
          <button
            onClick={() => router.push('/pricing-plan')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            عرض خطط الاشتراك
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl">الدورة غير موجودة</div>
      </div>
    );
  }

  return (
    <DomestikaCourseCreator
      initialCourse={course}
      onSave={handleCourseUpdate}
    />
  );
}
