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

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const loadCourse = async () => {
      try {
        const courseRef = ref(database, `courses/${params.id}`);
        const snapshot = await get(courseRef);

        if (!snapshot.exists()) {
          toast.error('الدورة غير موجودة');
          router.push('/courses');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('خطأ في تحميل الدورة:', error);
        toast.error('حدث خطأ في تحميل الدورة');
        router.push('/courses');
      }
    };

    loadCourse();
  }, [user, params.id, router]);

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div>
      {/* محتوى صفحة التحرير */}
    </div>
  );
}
