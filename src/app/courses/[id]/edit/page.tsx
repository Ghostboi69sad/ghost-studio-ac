'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { database } from '../../../lib/firebase';
import { ref, get, onValue, update } from 'firebase/database';
import { useAuth } from '../../../lib/auth-context';
import DomestikaCourseCreator from '../../../components/course-creator/components/domestika-creator';
import { Course, AccessType, CourseUpdate } from '../../../components/course-creator/types/course';
import { toast } from 'react-toastify';

export default function EditCoursePage() {
  const [course, setCourse] = useState<Course | null>(null);
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push('/courses');
      return;
    }

    const courseRef = ref(database, `courses/${id}`);
    const unsubscribe = onValue(courseRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCourse({ id: snapshot.key as string, ...data });
      } else {
        router.push('/courses');
      }
    });

    return () => unsubscribe();
  }, [id, user, router]);

  const handleCourseUpdate = async (updatedCourse: Course) => {
    try {
      const courseRef = ref(database, `courses/${id}`);

      const courseUpdate: CourseUpdate = {
        accessType: updatedCourse.accessType || 'free',
        subscriptionType: updatedCourse.subscriptionType || 'free',
        isPublic: updatedCourse.isPublic || false,
        price: Number(updatedCourse.price) || 0,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || '',
      };

      if (updatedCourse.stripePriceId) {
        courseUpdate.stripePriceId = updatedCourse.stripePriceId;
      }

      if (updatedCourse.paymentMethod) {
        courseUpdate.paymentMethod = updatedCourse.paymentMethod;
      }

      if (updatedCourse.paymentUrl) {
        courseUpdate.paymentUrl = updatedCourse.paymentUrl;
      }

      await update(courseRef, courseUpdate);
      toast.success('تم تحديث الدورة بنجاح');
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('فشل تحديث الدورة');
    }
  };

  const handlePurchaseCourse = async (courseId: string, paymentMethod: 'stripe' | 'flouci') => {
    try {
      if (!user || !course) {
        router.push('/login');
        return;
      }

      if (paymentMethod === 'stripe') {
        if (!course.stripePriceId) {
          throw new Error('Stripe price ID not found');
        }
        // Handle Stripe payment
        const response = await fetch('/.netlify/functions/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: course.stripePriceId,
            userId: user.uid,
            courseId: courseId,
            mode: 'payment',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }
        const { sessionId } = await response.json();
        window.location.href = `https://checkout.stripe.com/c/pay/${sessionId}`;
      } else if (paymentMethod === 'flouci') {
        // Handle Flouci payment
        const response = await fetch('/api/create-flouci-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Number(course.price),
            courseId: courseId,
            userId: user.uid,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create Flouci payment');
        }
        const { paymentUrl } = await response.json();
        window.location.href = paymentUrl;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase');
    }
  };

  if (!course) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-purple-900'>
        <div className='text-white text-xl'>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <DomestikaCourseCreator
      initialCourse={course}
      onSave={handleCourseUpdate}
      onPurchase={handlePurchaseCourse}
    />
  );
}
