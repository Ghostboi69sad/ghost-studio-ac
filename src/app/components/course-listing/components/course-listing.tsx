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
import { Course, Lesson, Chapter, SubscriptionType } from '../types/course';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-toastify';

interface StripeProduct {
  id: string;
  priceId: string;
  unitAmount: number;
}

export function CourseListingComponent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    name: '',
    title: '',
    description: '',
    category: '',
    price: 0,
    accessType: 'free',
    subscriptionType: 'free',
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
      const coursesRef = ref(database, 'courses');
      onValue(coursesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const courseList = Object.entries(data).map(([id, course]) => ({
            id,
            ...(course as Omit<Course, 'id'>),
          }));
          setCourses(courseList);
        }
      });
    }
  }, [user, router]);

  const coursesPerPage = 15;
  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const currentCourses = filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse);

  const handleAddCourse = async () => {
    try {
      const courseRef = ref(database, 'courses');
      const newCourseRef = push(courseRef);
      const courseId = newCourseRef.key;

      const courseData = {
        ...newCourse,
        id: courseId,
        title: newCourse.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid,
      };

      await set(newCourseRef, courseData);
      setNewCourse({
        name: '',
        title: '',
        description: '',
        category: '',
        price: 0,
        accessType: 'free',
        subscriptionType: 'free',
        isPublic: true,
        instructor: '',
        duration: '',
        level: 'Beginner',
        enrolledStudents: 0,
        videoCount: 0,
        rating: 0,
        chapters: [],
      });
      toast.success('Course added successfully');
    } catch (error) {
      console.error('Error adding course:', error);
      toast.error('Failed to add course');
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete || !user) return;

    try {
      // Check if user is admin
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();

      if (userData?.role !== 'admin') {
        toast.error('Only admins can delete courses');
        return;
      }

      // Delete the course
      const courseRef = ref(database, `courses/${courseToDelete.id}`);
      await remove(courseRef);

      // Delete associated content (if any)
      if (courseToDelete.chapters) {
        for (const chapter of courseToDelete.chapters) {
          if (chapter.content) {
            // Delete content files if needed
            // Add S3 deletion logic here if required
          }
        }
      }

      toast.success('Course deleted successfully');
      setCourseToDelete(null);
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handlePurchaseCourse = async (course: Course) => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (course.accessType === 'paid') {
      try {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: process.env.NEXT_PUBLIC_BASE_PRICE_ID,
            quantity: course.price,
            courseId: course.id,
            userId: user.uid,
          }),
        });

        if (!response.ok) throw new Error('Payment failed');

        const { sessionId } = await response.json();
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        await stripe?.redirectToCheckout({ sessionId });
      } catch (error) {
        console.error('Payment error:', error);
      }
    }
  };

  const handleUpdateCourse = async () => {
    if (!courseToEdit) return;

    try {
      const courseRef = ref(database, `courses/${courseToEdit.id}`);
      await update(courseRef, {
        ...courseToEdit,
        updatedAt: new Date().toISOString(),
      });
      setCourseToEdit(null);
      toast.success('تم تحديث الدورة بنجاح');
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('فشل تحديث الدورة');
    }
  };

  const handleEditCourse = (courseId: string) => {
    router.push(`/courses/${courseId}/edit`);
  };

  return (
    <div className='min-h-screen bg-black'>
      <nav className='bg-black shadow-md border-b border-gray-800'>
        <div className='container mx-auto px-6 py-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <Link href='/' className='flex items-center'>
                <Image
                  src='/GHOST LOGO11.png'
                  alt='Ghost Studio Logo'
                  width={150}
                  height={150}
                  className='mr-2'
                  priority
                />
                <span className='text-2xl font-bold text-white hover:text-purple-400'>
                  Ghost Studio
                </span>
              </Link>
            </div>

            <div className='flex items-center space-x-4'>
              <Link href='/pricing-plan' className='text-white hover:text-purple-400'>
                Pricing Plans
              </Link>
              {user ? (
                <div className='flex items-center space-x-4'>
                  <span className='text-white'>{user.email}</span>
                  <Button
                    variant='outline'
                    onClick={handleLogout}
                    className='bg-white text-black border-white hover:bg-gray-200'
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <Link href='/login'>
                  <Button variant='outline' className='text-white border-white hover:bg-purple-900'>
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className='container mx-auto px-6 py-8'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-4xl font-bold text-white'>Courses to improve your skills</h1>
        </div>
        <div className='max-w-xl mx-auto mb-8'>
          <Input
            type='text'
            placeholder='Search courses'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full bg-gray-900 text-white border-gray-700'
          />
        </div>
        <div className='flex justify-between items-center mb-8'>
          <div className='flex space-x-8'>
            <div className='text-center'>
              <p className='text-4xl font-bold text-white'>{courses.length}+</p>
              <p className='text-sm text-gray-300'>Amazing Courses</p>
            </div>
            <div className='text-center'>
              <p className='text-4xl font-bold text-white'>12+</p>
              <p className='text-sm text-gray-300'>Professional Mentors</p>
            </div>
            <div className='text-center'>
              <p className='text-4xl font-bold text-white'>90k+</p>
              <p className='text-sm text-gray-300'>Good Reviews</p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add New Course</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Course</DialogTitle>
                </DialogHeader>
                <div className='grid gap-4 py-4'>
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='name' className='text-right'>
                      Name
                    </Label>
                    <Input
                      id='name'
                      value={newCourse.name}
                      onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                      className='col-span-3'
                    />
                  </div>
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='description' className='text-right'>
                      Description
                    </Label>
                    <Input
                      id='description'
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                      className='col-span-3'
                    />
                  </div>
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='category' className='text-right'>
                      Category
                    </Label>
                    <Input
                      id='category'
                      value={newCourse.category}
                      onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
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
                      onChange={(e) =>
                        setNewCourse({ ...newCourse, price: parseFloat(e.target.value) })
                      }
                      className='col-span-3'
                    />
                  </div>
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='accessType' className='text-right'>
                      Access Type
                    </Label>
                    <Select
                      value={newCourse.accessType}
                      onValueChange={(value) =>
                        setNewCourse({ ...newCourse, accessType: value as 'free' | 'paid' })
                      }
                    >
                      <SelectTrigger className='col-span-3'>
                        <SelectValue placeholder='Select an access type' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='free'>Free</SelectItem>
                        <SelectItem value='paid'>Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='grid grid-cols-4 items-center gap-4'>
                    <Label htmlFor='isPublic' className='text-right'>
                      Public
                    </Label>
                    <Select
                      value={newCourse.isPublic ? 'true' : 'false'}
                      onValueChange={(value) =>
                        setNewCourse({
                          ...newCourse,
                          isPublic: value === 'true',
                        })
                      }
                    >
                      <SelectTrigger className='col-span-3'>
                        <SelectValue placeholder='Select public status' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='true'>Public</SelectItem>
                        <SelectItem value='false'>Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAddCourse}>Add Course</Button>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className='bg-gray-100 p-8 rounded-lg'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className='bg-gray-800 border-gray-700 text-white hover:bg-gray-700 transition-colors duration-200'
              >
                <CardHeader>
                  <CardTitle className='text-xl font-bold text-white'>{course.title}</CardTitle>
                  <p className='text-gray-300'>{course.description}</p>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    <div className='flex items-center'>
                      <User className='w-4 h-4 mr-2 text-gray-400' />
                      <span className='text-gray-300'>{course.instructor}</span>
                    </div>
                    <div className='flex items-center'>
                      <Clock className='w-4 h-4 mr-2 text-gray-400' />
                      <span className='text-gray-300'>{course.duration}</span>
                    </div>
                    <div className='flex items-center'>
                      <BookOpen className='w-4 h-4 mr-2 text-gray-400' />
                      <span className='text-gray-300'>{course.level}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className='flex justify-between items-center'>
                  <span className='text-sm bg-gray-700 text-gray-300 px-2 py-1 rounded'>
                    {course.category}
                  </span>
                  <div className='flex items-center'>
                    <span className='text-2xl font-bold text-purple-400'>${course.price}</span>
                    <span className='text-sm text-gray-400 ml-2'>
                      /
                      {course.videoCount ||
                        course.chapters?.reduce(
                          (acc, chapter) => acc + chapter.lessons.length,
                          0
                        ) ||
                        0}{' '}
                      Videos
                    </span>
                  </div>
                </CardFooter>
                <CardFooter className='flex justify-between items-center'>
                  <span className='text-sm bg-gray-700 text-gray-300 px-2 py-1 rounded'>
                    {course.subscriptionType || course.accessType}
                  </span>
                  <Link href={`/courses/${course.id}`}>
                    <Button
                      variant='outline'
                      className='text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white'
                    >
                      View Course
                    </Button>
                  </Link>
                </CardFooter>
                {user?.role === 'admin' && (
                  <CardFooter className='flex justify-between items-center'>
                    <Button
                      variant='outline'
                      onClick={() => router.push(`/courses/${course.id}/edit`)}
                      className='text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white'
                    >
                      <Edit className='w-4 h-4 mr-2 text-purple-400' />
                      <span className='text-purple-400'>تحرير المحتوى</span>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant='destructive'
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToDelete(course);
                          }}
                        >
                          <Trash2 className='w-4 h-4 mr-2' /> Delete Course
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Deletion</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete "{courseToDelete?.title}"? This action
                            cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant='outline' onClick={() => setCourseToDelete(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant='destructive'
                            onClick={handleDeleteCourse}
                            disabled={!courseToDelete}
                          >
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardFooter>
                )}
                <Dialog>
                  <DialogTrigger>
                    <Button variant='ghost' className='text-purple-400'>
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    {previewVideo && (
                      <video
                        src={previewVideo}
                        controls
                        className='w-full rounded-lg'
                        poster={course.thumbnail}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </Card>
            ))}
          </div>
        </div>
        <div className='flex justify-center mt-8 space-x-4'>
          <Button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className='w-4 h-4 mr-2' /> Previous
          </Button>
          <span className='text-white'>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next <ChevronRight className='w-4 h-4 ml-2' />
          </Button>
        </div>
      </div>
    </div>
  );
}
export default CourseListingComponent;
