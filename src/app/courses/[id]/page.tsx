'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { database } from '../../lib/firebase'
import { ref, onValue } from 'firebase/database'
import { useAuth } from '../../lib/auth-context'
import { Button } from "../../lib/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../lib/ui/card"
import { Course } from '../../components/course-creator/types/course'
import VideoPlayer from '../../components/course-creator/components/video-player'
import { toast } from 'react-toastify'
import { getMediaUrl } from '../../lib/aws/cloudfront-config';

export default function CoursePage() {
  const [course, setCourse] = useState<Course | null>(null)
  const [currentLesson, setCurrentLesson] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const courseRef = ref(database, `courses/${id}`)
    const unsubscribe = onValue(courseRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const courseData = { id: snapshot.key as string, ...data }
        setCourse(courseData)
        if (data.chapters && data.chapters.length > 0) {
          const firstChapter = Object.values(data.chapters)[0] as any
          if (firstChapter.lessons && firstChapter.lessons.length > 0) {
            setCurrentLesson(Object.values(firstChapter.lessons)[0])
          }
        }
      } else {
        setError('Course not found')
      }
      setLoading(false)
    }, (error) => {
      setError('Failed to load course')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [id])

  const handlePurchaseCourse = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!course) return

    try {
      if (course.accessType === 'paid') {
        if (course.paymentMethod === 'stripe') {
          // Handle Stripe payment
          const response = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              priceId: course.stripePriceId,
              courseId: course.id,
              userId: user.uid,
              mode: 'payment'
            })
          })

          if (!response.ok) throw new Error('Payment failed')
          
          const { sessionId } = await response.json()
          window.location.href = `https://checkout.stripe.com/c/pay/${sessionId}`
        } else {
          // Handle Flouci payment
          const response = await fetch('/api/create-flouci-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: course.price,
              courseId: course.id,
              userId: user.uid
            })
          })

          if (!response.ok) throw new Error('Payment failed')
          
          const { paymentUrl } = await response.json()
          window.location.href = paymentUrl
        }
      } else if (course.accessType === 'subscription') {
        router.push('/pricing-plan')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Failed to process payment')
    }
  }

  const getVideoUrl = (url: string) => {
    if (url.startsWith('http')) {
      return url;
    }
    return getMediaUrl(url); // Convert S3 key to CloudFront URL
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">{error || 'Course not found'}</div>
      </div>
    )
  }

  const canAccessCourse = course.accessType === 'free' || 
    (user && (
      user.role === 'admin' || 
      (course.accessType === 'subscription' && user.subscription?.status === 'active') ||
      (course.accessType === 'paid' && course.purchasedBy?.includes(user.uid))
    ))

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        {user?.role === 'admin' && (
          <Button onClick={() => router.push(`/courses/${id}/edit`)}>
            Edit Course
          </Button>
        )}
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {canAccessCourse ? (
            currentLesson ? (
              <div>
                <VideoPlayer
                  url={getVideoUrl(currentLesson.videoUrl)}
                  thumbnailUrl={course.thumbnail}
                  onLoadStart={() => setLoading(true)}
                  onLoaded={() => setLoading(false)}
                />
                <h2 className="text-2xl font-bold mt-4">{currentLesson.title}</h2>
              </div>
            ) : (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
                <p>No lessons available yet.</p>
              </div>
            )
          ) : (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
              <p className="font-bold">Access Restricted</p>
              <p>
                {course.accessType === 'subscription' 
                  ? 'You need an active subscription to access this content.'
                  : 'You need to purchase this course to access the content.'}
              </p>
              <Button 
                onClick={handlePurchaseCourse}
                className="mt-4"
              >
                {course.accessType === 'subscription' 
                  ? 'View Subscription Plans'
                  : `Purchase Course (${course.paymentMethod === 'stripe' ? '$' : 'TND'} ${course.price})`}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Course Content</CardTitle>
          </CardHeader>
          <CardContent>
            {course.chapters && course.chapters.length > 0 ? (
              <div className="space-y-4">
                {course.chapters.map((chapter, chapterIndex) => (
                  <div key={chapter.id} className="border rounded p-4">
                    <h3 className="font-bold mb-2">{chapter.title}</h3>
                    {chapter.lessons && chapter.lessons.length > 0 ? (
                      <ul className="space-y-2">
                        {chapter.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Button
                              variant={currentLesson?.id === lesson.id ? "default" : "outline"}
                              className="w-full justify-start"
                              onClick={() => canAccessCourse && setCurrentLesson(lesson)}
                              disabled={!canAccessCourse}
                            >
                              {lesson.title}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No lessons in this chapter</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No chapters available</p>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-sm text-gray-500">
              {course.chapters?.length || 0} chapters • {course.accessType}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}