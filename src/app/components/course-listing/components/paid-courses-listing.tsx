'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Star, ChevronLeft, ChevronRight, Trash2, Edit, User, Clock, BookOpen } from 'lucide-react';
import { database } from '../lib/firebase';
import { ref, onValue, push, remove, update, set, get } from 'firebase/database';
import { useAuth } from '../../../lib/auth-context';
import Image from 'next/image';
import { Course } from '../types/course';
import { toast } from 'react-toastify';

export function PaidCoursesListing() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasedCourses, setPurchasedCourses] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchPaidCourses();
    if (user) {
      fetchPurchasedCourses();
    }
  }, [user]);

  const fetchPaidCourses = async () => {
    try {
      const response = await fetch('/api/courses/paid');
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.filter((course: Course) => course.accessType === 'paid'));
    } catch (error) {
      console.error('Error fetching paid courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasedCourses = async () => {
    if (!user) return;
    
    try {
      const promises = courses.map(async (course) => {
        const purchased = await checkPurchaseStatus(course.id);
        return [course.id, purchased];
      });
      
      const results = await Promise.all(promises);
      const purchasedMap = Object.fromEntries(results);
      setPurchasedCourses(purchasedMap);
    } catch (error) {
      console.error('Error fetching purchased courses:', error);
    }
  };

  const handlePurchaseCourse = async (course: Course) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          courseId: course.id,
          userId: user.uid,
          amount: course.price,
          type: course.accessType === 'subscription' ? 'subscription' : 'course'
        }),
      });

      if (!response.ok) throw new Error('فشل الدفع');

      const { approvalUrl } = await response.json();
      window.location.href = approvalUrl;
    } catch (error) {
      console.error('خطأ في الدفع:', error);
      toast.error('فشل في إنشاء جلسة الدفع');
    }
  };

  const checkPurchaseStatus = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/check-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ courseId })
      });
      
      const { purchased } = await response.json();
      return purchased;
    } catch (error) {
      console.error('Error checking purchase status:', error);
      return false;
    }
  };

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {courses.map((course) => (
        <div key={course.id} className="border rounded-lg overflow-hidden shadow-lg">
          <div className="relative h-48">
            <Image
              src={course.thumbnail || '/placeholder.jpg'}
              alt={course.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <h3 className="text-xl font-bold mb-2">{course.title}</h3>
            <p className="text-gray-600 mb-4">{course.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">${course.price}</span>
              {user ? (
                purchasedCourses[course.id] ? (
                  <Button onClick={() => router.push(`/courses/${course.id}`)}>
                    عرض الدورة
                  </Button>
                ) : (
                  <Button onClick={() => handlePurchaseCourse(course)}>
                    شراء الدورة
                  </Button>
                )
              ) : (
                <Button onClick={() => router.push('/login')}>
                  تسجيل الدخول للشراء
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}