'use client';

import { useState, useEffect } from 'react';

import { ref, onValue, push, remove, update, set, get } from 'firebase/database';
import { Star, ChevronLeft, ChevronRight, Trash2, Edit, User, Clock, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../../lib/auth-context';
import { database } from '../lib/firebase';
import { Course } from '../types/course';
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function PaidCoursesListing() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasedCourses, setPurchasedCourses] = useState<Record<string, boolean>>({});
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    title: '',
    description: '',
    category: '',
    price: 0,
    accessType: 'paid',
    subscriptionType: 'paid',
    isPublic: true,
    instructor: '',
    duration: '',
    level: 'Beginner',
    enrolledStudents: 0,
    videoCount: 0,
    rating: 0,
    chapters: [],
  });
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const initializeCourses = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      await fetchPaidCourses();
      await fetchPurchasedCourses();
    };

    if (user) {
      initializeCourses();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPaidCourses = async () => {
    try {
      if (!user) {
        console.log('لا يوجد مستخدم مسجل');
        setCourses([]);
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      console.log('تم الحصول على التوكن');

      const response = await fetch('/api/courses/paid', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('استجابة الخادم:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('نص الاستجابة:', responseText);

      if (!response.ok) {
        throw new Error(`فشل في جلب الدورات: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('استجابة غير صالحة من الخادم: نوع المحتوى غير صحيح');
      }

      const data = JSON.parse(responseText);
      console.log('تم استلام البيانات:', data);
      setCourses(data.courses || []);
    } catch (error) {
      console.error('خطأ في جلب الدورات المدفوعة:', error);
      toast.error('فشل في تحميل الدورات');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasedCourses = async () => {
    if (!user) return;

    try {
      const promises = courses.map(async course => {
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
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          userId: user.uid,
          amount: course.price,
        }),
      });

      if (!response.ok) throw new Error('فشل الدفع');

      const { orderId } = await response.json();
      window.location.href = `${process.env.NEXT_PUBLIC_PAYPAL_URL}/${orderId}`;
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
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({ courseId }),
      });

      const { purchased } = await response.json();
      return purchased;
    } catch (error) {
      console.error('Error checking purchase status:', error);
      return false;
    }
  };

  const coursesPerPage = 15;
  const filteredCourses = courses.filter(course =>
    course.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

  const handleAddCourse = async () => {
    try {
      if (!user) {
        toast.error('يجب تسجيل الدخول لإضافة دورة');
        return;
      }

      const courseData = {
        ...newCourse,
        createdBy: user.uid,
        updatedBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accessType: 'paid',
        subscriptionType: 'paid',
        isPublic: true,
      };

      const coursesRef = ref(database, 'courses');
      const newCourseRef = push(coursesRef);
      await set(newCourseRef, courseData);

      setNewCourse({
        title: '',
        description: '',
        category: '',
        price: 0,
        accessType: 'paid',
        subscriptionType: 'paid',
        isPublic: true,
        instructor: '',
        duration: '',
        level: 'Beginner',
        enrolledStudents: 0,
        videoCount: 0,
        rating: 0,
        chapters: [],
      });

      toast.success('تم إضافة الدورة بنجاح');
      await fetchPaidCourses();
    } catch (error) {
      console.error('خطأ في إضافة الدورة:', error);
      toast.error('فشل في إضافة الدورة');
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    try {
      const courseRef = ref(database, `courses/${courseToDelete.id}`);
      await remove(courseRef);
      setCourseToDelete(null);
      toast.success('تم حذف الدورة بنجاح');
      await fetchPaidCourses();
    } catch (error) {
      console.error('خطأ في حذف الدورة:', error);
      toast.error('فشل في حذف الدورة');
    }
  };

  const handleUpdateCourse = async () => {
    if (!courseToEdit) return;

    try {
      const courseRef = ref(database, `courses/${courseToEdit.id}`);
      await update(courseRef, {
        ...courseToEdit,
        updatedBy: user?.uid,
        updatedAt: new Date().toISOString(),
      });
      setCourseToEdit(null);
      toast.success('تم تحديث الدورة بنجاح');
      await fetchPaidCourses();
    } catch (error) {
      console.error('خطأ في تحديث الدورة:', error);
      toast.error('فشل في تحديث الدورة');
    }
  };

  const handleDeleteDialog = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToDelete(course);
  };

  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className='min-h-screen bg-black'>
      <div
        className='container mx-auto px-6 py-8'
        style={{
          backgroundImage: `linear-gradient(to right, #1f2937 1px, transparent 1px),
                           linear-gradient(to bottom, #1f2937 1px, transparent 1px)`,
          backgroundSize: '4rem 4rem',
          backgroundPosition: 'center center',
        }}
      >
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-4xl font-bold text-white'>Paid Courses</h1>
        </div>

        <div className='max-w-xl mx-auto mb-8'>
          <Input
            type='text'
            placeholder='Search courses'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full bg-gray-900 text-white border-gray-700'
          />
        </div>

        <div className='flex justify-between items-center mb-8'>
          <div className='flex space-x-8'>
            <div className='text-center'>
              <p className='text-4xl font-bold text-white'>{courses.length}+</p>
              <p className='text-sm text-gray-300'>Premium Courses</p>
            </div>
          </div>

          {user?.role === 'admin' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add New Paid Course</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Paid Course</DialogTitle>
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='title' className='text-right'>
                      Title
                    </Label>
                    <Input
                      id='title'
                      value={newCourse.title}
                      onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                      className='col-span-3'
                    />
                  </div>
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='price' className='text-right'>
                      Price
                    </Label>
                    <Input
                      id='price'
                      type='number'
                      value={newCourse.price}
                      onChange={e => setNewCourse({ ...newCourse, price: Number(e.target.value) })}
                      className='col-span-3'
                    />
                  </div>
                </div>
                <Button onClick={handleAddCourse}>Add Course</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {currentCourses.map(course => (
            <Card
              key={course.id}
              className='bg-gray-800/50 backdrop-blur-sm border-gray-700 text-white 
                         hover:bg-gray-700/70 hover:scale-[1.02] hover:shadow-xl 
                         transition-all duration-300 ease-in-out'
            >
              <CardHeader>
                <CardTitle className='text-xl font-bold text-white'>{course.title}</CardTitle>
                <p className='text-gray-300'>{course.description}</p>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span>Price:</span>
                    <span>${course.price}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Duration:</span>
                    <span>{course.duration}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span>Level:</span>
                    <span>{course.level}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className='flex justify-between'>
                {user ? (
                  <>
                    <Button
                      onClick={() => router.push(`/courses/${course.id}/edit`)}
                      className='bg-purple-600 hover:bg-purple-700 text-white'
                    >
                      View Course Details
                    </Button>
                    {!purchasedCourses[course.id] && (
                      <Button
                        onClick={() => handlePurchaseCourse(course)}
                        className='bg-amber-400 hover:bg-amber-500 text-black'
                      >
                        Purchase Course
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={() => router.push('/login')}
                    className='bg-gray-600 hover:bg-gray-700 text-white'
                  >
                    Login to Purchase
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className='flex justify-center mt-8 gap-4'>
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className='text-white'>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
