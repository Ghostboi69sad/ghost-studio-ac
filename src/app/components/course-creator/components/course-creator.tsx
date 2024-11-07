'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { database, storage } from '../../../lib/firebase'
import { ref as dbRef, push, set } from 'firebase/database'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useAuth } from '../../../lib/auth-context'
import { v4 as uuidv4 } from 'uuid'
import { uploadToS3 } from '../../../../lib/s3'
import { Course, Lesson, Chapter, SubscriptionType, AccessType } from '../types/course';

export function CourseCreatorComponent() {
  const [course, setCourse] = useState<Course>({
    id: '',
    name: '',
    title: '',
    description: '',
    instructor: '',
    duration: '',
    level: 'Beginner',
    rating: 0,
    enrolledStudents: 0,
    price: 0,
    chapters: [],
    isPublic: false,
    thumbnail: '',
    imageUrl: '',
    videoCount: 0,
    category: '',
    subscriptionType: 'free' as SubscriptionType,
    accessType: 'free' as AccessType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const [currentLessonTitle, setCurrentLessonTitle] = useState('')
  const [currentLessonFile, setCurrentLessonFile] = useState<File | null>(null)
  const [currentLessonUrl, setCurrentLessonUrl] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const { user } = useAuth()
  const router = useRouter()

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCurrentLessonFile(e.target.files[0])
      setCurrentLessonUrl(URL.createObjectURL(e.target.files[0]))
    }
  }

  const handleAddLesson = async () => {
    if (!currentLessonTitle || (!currentLessonFile && !currentLessonUrl)) return

    let videoUrl = currentLessonUrl

    if (currentLessonFile) {
      const storageType = process.env.NEXT_PUBLIC_STORAGE_TYPE || 'firebase';
      
      if (storageType === 's3') {
        const key = `courses/${uuidv4()}/${currentLessonFile.name}`;
        videoUrl = await uploadToS3(currentLessonFile, key);
      } else {
        const fileRef = storageRef(storage, `courses/${uuidv4()}`);
        await uploadBytes(fileRef, currentLessonFile);
        videoUrl = await getDownloadURL(fileRef);
      }
    }

    const newChapter: Chapter = {
      id: uuidv4(),
      title: currentLessonTitle,
      order: course.chapters.length + 1,
      content: [],
      lessons: [{
        id: uuidv4(),
        title: currentLessonTitle,
        videoUrl
      }]
    };

    setCourse({
      ...course,
      chapters: [...course.chapters, newChapter]
    });

    setCurrentLessonTitle('')
    setCurrentLessonFile(null)
    setCurrentLessonUrl('')
  }

  const handleCreateCourse = async () => {
    if (!user || user.role !== 'admin') {
      console.error('Unauthorized access')
      return
    }

    const courseRef = push(dbRef(database, 'courses'))
    const courseData = {
      name: course.title,
      description: course.description,
      category: course.category,
      price: course.price,
      subscriptionType: course.accessType,
      lessons: course.chapters,
      createdBy: user.uid,
      createdAt: new Date().toISOString()
    }

    await set(courseRef, courseData)
    router.push('/courses')
  }

  if (!user || user.role !== 'admin') {
    return <div>Unauthorized access</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-white">Create New Course</h1>
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <div className="grid gap-6">
          <div>
            <Label htmlFor="courseName">Course Name</Label>
            <Input
              id="courseName"
              value={course.title}
              onChange={(e) => setCourse({ ...course, title: e.target.value })}
              placeholder="Enter course name"
            />
          </div>
          <div>
            <Label htmlFor="courseDescription">Course Description</Label>
            <Textarea
              id="courseDescription"
              value={course.description}
              onChange={(e) => setCourse({ ...course, description: e.target.value })}
              placeholder="Enter course description"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={course.category}
              onChange={(e) => setCourse({ ...course, category: e.target.value })}
              placeholder="Enter course category"
            />
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              value={course.price}
              onChange={(e) => setCourse({ ...course, price: Number(e.target.value) })}
              min={0}
            />
          </div>
          <div>
            <Label htmlFor="subscriptionType">Subscription Type</Label>
            <Select 
              value={course.accessType} 
              onValueChange={(value: AccessType) => setCourse({ ...course, accessType: value, subscriptionType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select access type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-6 mt-6">
            <h2 className="text-xl font-bold mb-4">Add Lessons</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="lessonTitle">Lesson Title</Label>
                <Input
                  id="lessonTitle"
                  value={currentLessonTitle}
                  onChange={(e) => setCurrentLessonTitle(e.target.value)}
                  placeholder="Enter lesson title"
                />
              </div>
              <div>
                <Label htmlFor="lessonVideo">Lesson Video</Label>
                <Input
                  id="lessonVideo"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                />
                {currentLessonUrl && (
                  <video ref={videoRef} src={currentLessonUrl} controls className="mt-2 w-full" />
                )}
              </div>
              <Button onClick={handleAddLesson} className="w-full">
                Add Lesson
              </Button>
            </div>

            {course.chapters.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-2">Current Lessons</h3>
                <ul className="space-y-2">
                  {course.chapters.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span>{lesson.title}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCourse({
                          ...course,
                          chapters: course.chapters.filter(l => l.id !== lesson.id)
                        })}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button 
            onClick={handleCreateCourse} 
            className="mt-6 bg-purple-600 hover:bg-purple-700"
            disabled={!course.title || !course.description || !course.category || course.chapters.length === 0}
          >
            Create Course
          </Button>
        </div>
      </div>
    </div>
  )
}