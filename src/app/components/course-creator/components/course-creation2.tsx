import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { database } from '../../../lib/firebase'
import { ref as dbRef, push, set } from 'firebase/database'
import { useAuth } from '../../../lib/auth-context'
import { v4 as uuidv4 } from 'uuid'
import EnhancedVideoPlayer from './EnhancedVideoPlayer'

interface Lesson {
  id: string
  title: string
  videoUrl: string
  duration: number
  thumbnailUrl?: string
}

export default function CourseCreator2() {
  const [courseName, setCourseName] = useState('')
  const [courseDescription, setCourseDescription] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState(0)
  const [subscriptionType, setSubscriptionType] = useState<'free' | 'paid' | 'subscription'>('free')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [currentLessonTitle, setCurrentLessonTitle] = useState('')
  const [currentLessonUrl, setCurrentLessonUrl] = useState('')
  const [currentLessonDuration, setCurrentLessonDuration] = useState(0)
  const { user } = useAuth()
  const router = useRouter()

  // Cache for preloaded video metadata
  const videoCache = useRef<Map<string, { duration: number }>>(new Map())

  useEffect(() => {
    // Preload metadata for all lesson videos
    lessons.forEach(lesson => {
      if (!videoCache.current.has(lesson.videoUrl)) {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => {
          videoCache.current.set(lesson.videoUrl, { duration: video.duration })
        }
        video.src = lesson.videoUrl
      }
    })
  }, [lessons])

  const handleAddLesson = async () => {
    if (!currentLessonTitle || !currentLessonUrl) return

    const newLesson: Lesson = {
      id: uuidv4(),
      title: currentLessonTitle,
      videoUrl: currentLessonUrl,
      duration: currentLessonDuration
    }

    setLessons([...lessons, newLesson])
    setCurrentLessonTitle('')
    setCurrentLessonUrl('')
    setCurrentLessonDuration(0)
  }

  const handleCreateCourse = async () => {
    if (!user || user.role !== 'admin') {
      console.error('Unauthorized access')
      return
    }

    const courseRef = push(dbRef(database, 'courses'))
    const courseData = {
      name: courseName,
      description: courseDescription,
      category,
      price,
      subscriptionType,
      lessons: lessons.map(({ id, title, videoUrl, duration }) => ({ id, title, videoUrl, duration })),
      createdBy: user.uid,
      createdAt: new Date().toISOString()
    }

    await set(courseRef, courseData)
    router.push('/courses')
  }

  const handleVideoMetadataLoaded = (duration: number) => {
    setCurrentLessonDuration(duration)
  }

  if (!user || user.role !== 'admin') {
    return <div>Unauthorized access</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Course</h1>
      <div className="grid gap-6">
        <div>
          <Label htmlFor="courseName">Course Name</Label>
          <Input
            id="courseName"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="courseDescription">Course Description</Label>
          <Textarea
            id="courseDescription"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="subscriptionType">Subscription Type</Label>
          <Select
            value={subscriptionType}
            onValueChange={(value) => setSubscriptionType(value as 'free' | 'paid' | 'subscription')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a subscription type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-4">Lessons</h2>
          {lessons.map((lesson, index) => (
            <div key={lesson.id} className="mb-4">
              <h3 className="font-bold">{index + 1}. {lesson.title}</h3>
              <EnhancedVideoPlayer
                src={lesson.videoUrl}
                thumbnailUrl={lesson.thumbnailUrl}
                onProgress={(progress) => {
                  // Handle progress if needed
                  console.log(`Lesson ${lesson.id} progress: ${progress}%`);
                }}
              />
            </div>
          ))}
          <div className="grid gap-4 mt-4">
            <Input
              placeholder="Lesson Title"
              value={currentLessonTitle}
              onChange={(e) => setCurrentLessonTitle(e.target.value)}
            />
            <Input
              placeholder="Video URL (S3 or CloudFront)"
              value={currentLessonUrl}
              onChange={(e) => setCurrentLessonUrl(e.target.value)}
            />
            {currentLessonUrl && (
              <EnhancedVideoPlayer
                src={currentLessonUrl}
                onLoadedMetadata={handleVideoMetadataLoaded}
                onProgress={(progress) => {
                  // Handle progress for new lesson
                  console.log(`New lesson progress: ${progress}%`);
                }}
              />
            )}
            <Button onClick={handleAddLesson}>Add Lesson</Button>
          </div>
        </div>
        <Button onClick={handleCreateCourse}>Create Course</Button>
      </div>
    </div>
  )
}