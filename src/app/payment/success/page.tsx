'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import { toast } from 'react-toastify'
import { Button } from '../../lib/ui/button'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id') // Stripe
        const transactionId = searchParams.get('transactionId') // Flouci
        const paymentMethod = searchParams.get('payment_method')
        const courseId = searchParams.get('courseId')

        if (!user) {
          toast.error('Please login to verify your purchase')
          router.push('/login')
          return
        }

        if (sessionId && paymentMethod === 'stripe') {
          // Verify Stripe payment
          const response = await fetch('/.netlify/functions/verify-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sessionId,
              courseId,
              userId: user.uid
            })
          })

          if (!response.ok) {
            throw new Error('Failed to verify Stripe payment')
          }

          const { isPurchaseValid } = await response.json()
          if (!isPurchaseValid) {
            throw new Error('Payment verification failed')
          }
        } else if (transactionId && paymentMethod === 'flouci') {
          // Verify Flouci payment
          const response = await fetch('/api/verify-flouci-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              transactionId,
              courseId,
              userId: user.uid
            })
          })

          if (!response.ok) {
            throw new Error('Failed to verify Flouci payment')
          }
        } else {
          throw new Error('Invalid payment verification parameters')
        }

        toast.success('Payment verified successfully')
        setVerifying(false)
      } catch (error) {
        console.error('Payment verification error:', error)
        toast.error('Payment verification failed')
        router.push('/payment/failed')
      }
    }

    verifyPayment()
  }, [searchParams, router, user])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-800">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full mx-4">
        {verifying ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Verifying Payment</h1>
            <p className="text-gray-600 mb-4">Please wait while we verify your payment...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">Thank you for your purchase. Your payment has been processed successfully.</p>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/courses')}
                className="w-full"
              >
                View Courses
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Return Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 