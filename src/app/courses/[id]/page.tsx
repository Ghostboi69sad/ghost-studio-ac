'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { database } from '../../lib/firebase';
import { ref, onValue, update, get } from 'firebase/database';
import { useAuth } from '../../lib/auth-context';
import { Button } from '../../lib/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../lib/ui/card';
import { Course } from '../../components/course-creator/types/course';
import { VideoPlayer } from '../../components/course-creator/components/video-player/index';
import { toast } from 'react-toastify';
import { getMediaUrl } from '../../lib/aws/cloudfront-config';
import { auth } from '../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import CourseCreator2 from '../../components/course-creator/components/course-creation2';

export default async function CoursePage({ params }: { params: { id: string } }) {
  try {
    const [course, setCourse] = useState<Course>({
      id: '',
      name: '',
      title: '',
      description: '',
      category: '',
      price: 0,
      subscriptionType: 'free',
      accessType: 'free',
      imageUrl: '',
      videoCount: 0,
      rating: 0,
      isPublic: false,
      thumbnail: '',
      instructor: '',
      duration: '0',
      level: 'beginner',
      enrolledStudents: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: [{
        id: uuidv4(),
        title: 'Chapter 1',
        order: 1,
        content: [],
        lessons: [{
          id: uuidv4(),
          title: 'Lesson 1',
          videoUrl: '',
          duration: '0'
        }]
      }]
    });
    const [currentLesson, setCurrentLesson] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const { id } = useParams();
    const { user, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
      const courseRef = ref(database, `courses/${id}`);
      const unsubscribe = onValue(
        courseRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const courseData = {
              id: snapshot.key,
              ...data,
              chapters: data.chapters || []
            };
            setCourse(courseData);
            
            // تعيين الدرس الأول تلقائياً
            if (courseData.chapters?.[0]?.lessons?.[0]) {
              setCurrentLesson(courseData.chapters[0].lessons[0]);
            }
          } else {
            setError('Course not found');
          }
          setLoading(false);
        },
        (error) => {
          setError('Failed to load course');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }, [id]);

    const handlePurchaseCourse = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      if (!course) return;

      try {
        if (course.accessType === 'subscription') {
          router.push('/pricing-plan');
        } else if (course.accessType === 'free') {
          // السماح بالوصول للدورات المجانية
          return true;
        }
      } catch (error) {
        console.error('Payment error:', error);
        toast.error('Failed to process payment');
      }
    };

    const getVideoUrl = async (url: string): Promise<string> => {
      try {
        return await getMediaUrl(url, { 
          isPublic: false,
          useBackup: false
        });
      } catch (error) {
        console.error('Error getting video URL:', error);
        return url; // إرجاع الرابط الأصلي كنسخة احتياطية
      }
    };

    // تحديث عرض مشغل الفيديو
    const renderVideoPlayer = () => {
      if (!currentLesson?.videoUrl) return null;

      return (
        <div>
          <VideoPlayer
            url={currentLesson.videoUrl}
            thumbnailUrl={course?.thumbnail}
            onLoadStart={() => setLoading(true)}
            onLoaded={() => setLoading(false)}
            onProgress={(progress: number) => {
              if (currentLesson.id) {
                updateProgress(currentLesson.id);
              }
            }}
            autoPlay={false}
          />
          <h2 className='text-2xl font-bold mt-4'>{currentLesson.title}</h2>
        </div>
      );
    };

    // تتبع تقدم المستخدم
    const updateProgress = async (lessonId: string) => {
      if (!user || !course) return;

      try {
        const progressRef = ref(database, `progress/${user.uid}/${course.id}`);
        const completedLessons = new Set((await get(progressRef)).val()?.completedLessons || []);
        completedLessons.add(lessonId);

        const totalLessons = course.chapters.reduce(
          (total, chapter) => total + chapter.lessons.length,
          0
        );

        const newProgress = (completedLessons.size / totalLessons) * 100;

        await update(progressRef, {
          completedLessons: Array.from(completedLessons),
          progress: newProgress,
          lastAccessed: new Date().toISOString(),
        });

        setProgress(newProgress);
      } catch (error) {
        console.error('خطأ في تحديث التقدم:', error);
      }
    };

    // تحديث الدر الحالي مع تتبع التقدم
    const handleLessonChange = (lesson: any) => {
      setCurrentLesson(lesson);
      updateProgress(lesson.id);
    };

    const checkUserAuth = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          router.push('/login');
          return;
        }

        const token = await currentUser.getIdToken(true);
        if (!token) {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
        router.push('/login');
      }
    };

    // التحقق من إمكانية الوصول للدورة
    const canAccessCourse = useCallback(
      (course: Course | null) => {
        if (!course) return false;
        if (isAdmin) return true;
        if (course.accessType === 'free') return true;
        if (!user) return false;

        if (course.accessType === 'paid') {
          return user.hasPurchased && user.hasPurchased(course.id);
        }

        if (course.accessType === 'subscription') {
          return user.hasActiveSubscription === true;
        }

        return false;
      },
      [user, isAdmin]
    );

    useEffect(() => {
      if (!course) return;

      if (!canAccessCourse(course)) {
        if (!user) {
          router.push('/login');
        } else if (course.accessType === 'subscription') {
          router.push('/pricing-plan');
        } else if (course.accessType === 'paid' && !user.hasPurchased?.(course.id)) {
          router.push('/pricing-plan');
        }
      }
    }, [course, user, canAccessCourse, router]);

    if (loading) {
      return (
        <div className='min-h-screen flex items-center justify-center'>
          <div className='text-xl'>Loading...</div>
        </div>
      );
    }

    if (error || !course) {
      return (
        <div className='min-h-screen flex items-center justify-center'>
          <div className='text-xl text-red-500'>{error || 'Course not found'}</div>
        </div>
      );
    }

    // التحقق من الوصول قبل عرض المحتوى
    if (!canAccessCourse(course)) {
      return (
        <div className='text-center p-8'>
          <h2 className='text-xl font-bold mb-4'>لا يمكنك الوصول لهذه الدورة</h2>
          {!user ? (
            <Button onClick={() => router.push('/login')}>تسجيل الدخول</Button>
          ) : course?.accessType === 'subscription' ? (
            <Button onClick={() => router.push('/pricing-plan')}>الاشتراك في الخطة</Button>
          ) : null}
        </div>
      );
    }

    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-3xl font-bold'>{course.title}</h1>
          {user?.role === 'admin' && (
            <Button onClick={() => router.push(`/courses/${id}/edit`)}>Edit Course</Button>
          )}
        </div>

        {canAccessCourse(course) && (
          <div className='mb-4'>
            <div className='flex justify-between items-center mb-2'>
              <span>تقدمك في الدورة</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}

        <div className='grid md:grid-cols-3 gap-8'>
          <div className='md:col-span-2'>
            {canAccessCourse(course) ? (
              <CourseCreator2 
                initialCourse={course}
                onSave={async (updatedCourse) => {
                  setCourse(updatedCourse);
                  toast.success('تم تحديث الدورة بنجاح');
                }}
                readOnly={!isAdmin}
              />
            ) : (
              <div className='bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4'>
                <p className='font-bold'>Access Restricted</p>
                <p>
                  {course?.accessType === 'subscription'
                    ? 'You need an active subscription to access this content.'
                    : 'You need to purchase this course to access the content.'}
                </p>
                <Button onClick={handlePurchaseCourse} className='mt-4'>
                  {course?.accessType === 'subscription' ? 'View Subscription Plans' : 'Access Course'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading course:', error);
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">حدث خطأ أثناء تحميل الدورة</p>
      </div>
    );
  }
}
