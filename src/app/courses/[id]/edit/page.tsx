'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { toast } from 'react-toastify';

export default function EditCoursePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);

  useEffect(() => {
    const checkAuthAndLoadCourse = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // التحقق من صلاحيات المستخدم
        const userRef = ref(database, `users/${user.uid}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val();

        if (userData?.role !== 'admin') {
          toast.error('غير مصرح لك بتحرير الدورات');
          router.push('/courses');
          return;
        }

        // تحميل بيانات الدورة
        const courseRef = ref(database, `courses/${params.id}`);
        const courseSnapshot = await get(courseRef);

        if (!courseSnapshot.exists()) {
          toast.error('الدورة غير موجودة');
          router.push('/courses');
          return;
        }

        setCourse(courseSnapshot.val());
        setLoading(false);
      } catch (error) {
        console.error('خطأ:', error);
        toast.error('حدث خطأ في تحميل الدورة');
        router.push('/courses');
      }
    };

    checkAuthAndLoadCourse();
  }, [user, params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">تحرير الدورة</h1>
      {/* أضف نموذج تحرير الدورة هنا */}
    </div>
  );
}
