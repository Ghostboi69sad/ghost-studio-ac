'use client'

import { useRouter } from 'next/navigation'
import { Button } from '../../lib/ui/button'

export default function PaymentFailedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-800">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full mx-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          We're sorry, but your payment could not be processed. Please try again or contact support if the problem persists.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={() => router.back()}
            className="w-full"
          >
            Try Again
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/courses')}
            className="w-full"
          >
            Return to Courses
          </Button>
          <Button 
            variant="link"
            onClick={() => router.push('/support')}
            className="w-full"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  )
} 