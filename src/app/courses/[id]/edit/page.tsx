'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { database } from '../../../lib/firebase'
import { ref, get, onValue, update } from 'firebase/database'
import { useAuth } from '../../../lib/auth-context'
import DomestikaCourseCreator from '../../../components/course-creator/components/domestika-creator'
import { Course } from '../../../components/course-creator/types/course'
import { toast } from 'react-toastify'

export default function EditCoursePage() {
  const [course, setCourse] = useState<Course | null>(null)
  const { id } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/courses')
      return
    }

    const courseRef = ref(database, `courses/${id}`)
    const unsubscribe = onValue(courseRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        setCourse({ id: snapshot.key as string, ...data })
      } else {
        router.push('/courses')
      }
    })

    return () => unsubscribe()
  }, [id, user, router])

  const handleCourseUpdate = async (updatedCourse: Course) => {
    try {
      const courseRef = ref(database, `courses/${id}`)
      await update(courseRef, {
        ...updatedCourse,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid
      })
      toast.success('Course updated successfully')
      router.push('/courses')
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Failed to update course')
    }
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-purple-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return <DomestikaCourseCreator initialCourse={course} onSave={handleCourseUpdate} />
}