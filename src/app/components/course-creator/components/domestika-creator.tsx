import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth, db } from '../../../lib/firebase'
import { ref, set, push, get } from 'firebase/database'
import { Plus, Trash2, File, Video, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Button } from "./ui/ui/button"
import { Input } from "./ui/ui/input"
import { Label } from "./ui/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/ui/accordion"
import { Slider } from "./ui/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/ui/dialog"
import { cn } from "../lib/utils"
import { toast } from 'react-toastify'
// Import types from course.d.ts
import type { Course, Chapter, ContentItem } from '../types/course'
import { useAuth } from '../../../lib/auth-context'
import { ThemeProvider, useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { getMediaUrl } from '../lib/aws/cloudfront-config'
import { DomestikaCourseCreatorProps } from '../types/course';

const DomestikaCourseCreator: React.FC<DomestikaCourseCreatorProps> = ({ initialCourse, onSave }) => {
  // Initialize with all required fields from Course type
  const [course, setCourse] = useState<Course>({
    ...initialCourse,
    chapters: initialCourse.chapters || []
  });

  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [newContentUrl, setNewContentUrl] = useState('')
  const [newContentName, setNewContentName] = useState('')
  const [newContentType, setNewContentType] = useState<'video' | 'file'>('video')
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [accessType, setAccessType] = useState<'free' | 'paid' | 'subscription'>('free')
  const [hasSubscription, setHasSubscription] = useState(false)

  // Add theme toggle state
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Add S3 upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [priceUSD, setPriceUSD] = useState<number>(0)
  const [priceTND, setPriceTND] = useState<number>(0)
  const [stripePriceId, setStripePriceId] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'flouci'>('stripe')

  const searchParams = useSearchParams()

  // Add at the top with other imports
  const S3_BUCKET_URL = 'https://your-bucket-name.s3.your-region.amazonaws.com';

  // Function to handle S3 file upload
  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Get presigned URL from your API
      const response = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get upload URL')
      }

      const { uploadUrl, fileKey } = await response.json()

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      // Get CloudFront URL
      const cloudFrontUrl = getMediaUrl(fileKey)
      setNewContentUrl(cloudFrontUrl)
      setNewContentName(file.name)
      setNewContentType(file.type.startsWith('video/') ? 'video' : 'file')

      toast.success('File uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle initial client-side render
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const updateTime = () => setCurrentTime(videoElement.currentTime)
    const updateDuration = () => setDuration(videoElement.duration)

    videoElement.addEventListener('timeupdate', updateTime)
    videoElement.addEventListener('loadedmetadata', updateDuration)

    return () => {
      videoElement.removeEventListener('timeupdate', updateTime)
      videoElement.removeEventListener('loadedmetadata', updateDuration)
    }
  }, [activeVideo])

  const addChapter = () => {
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: `Chapter ${course.chapters.length + 1}`,
      order: course.chapters.length + 1,
      content: [],
      lessons: []
    }

    setCourse(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapter]
    }))
  }

  const addContent = (chapterIndex: number) => {
    setActiveChapterIndex(chapterIndex)
  }

  const handleAddContent = () => {
    if (activeChapterIndex === null) return

    // Format the S3 URL
    const fullUrl = newContentUrl.startsWith('http') 
      ? newContentUrl 
      : `${S3_BUCKET_URL}/${newContentUrl}`;

    const newContent: ContentItem = {
      id: `content-${Date.now()}`,
      type: newContentType,
      name: newContentName,
      url: fullUrl
    };

    setCourse(prev => {
      const newChapters = [...prev.chapters]
      newChapters[activeChapterIndex].content.push(newContent)
      return { 
        ...prev, 
        chapters: newChapters,
        videoCount: newContentType === 'video' ? prev.videoCount + 1 : prev.videoCount
      }
    })

    setNewContentUrl('')
    setNewContentName('')
    setActiveChapterIndex(null)
  }

  const removeContent = (chapterIndex: number, contentIndex: number) => {
    setCourse(prev => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].content.splice(contentIndex, 1)
      return { ...prev, chapters: newChapters }
    })
  }

  // Function to handle video URL processing
  const handleVideoClick = (url: string) => {
    const cloudFrontUrl = getMediaUrl(url)
    setActiveVideo(cloudFrontUrl)
    setIsPlaying(true)
    if (videoRef.current) {
      videoRef.current.src = cloudFrontUrl
      videoRef.current.play()
    }
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value
      setCurrentTime(value)
    }
  }

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value
      setVolume(value)
      setIsMuted(value === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10
    }
  }

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Check user role on component mount
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = ref(db, `users/${user.uid}`)
      const snapshot = await get(userRef)
      if (snapshot.exists()) {
        const userData = snapshot.val()
        setIsAdmin(userData.role === 'admin')
      }
    }

    checkUserRole()
  }, [user, router])

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (user && accessType === 'subscription') {
        try {
          const response = await fetch('/.netlify/functions/check-subscription-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
              courseId: course.id
            })
          });

          if (!response.ok) {
            throw new Error('Failed to check subscription');
          }

          const data = await response.json();
          setHasSubscription(data.hasActiveSubscription);
        } catch (error) {
          console.error('Error checking subscription:', error);
          toast.error('Failed to check subscription status');
        }
      }
    };

    checkSubscription();
  }, [user, accessType, course.id]);

  // Function to create Stripe price
  const createStripePrice = async () => {
    try {
      const response = await fetch('/.netlify/functions/create-stripe-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: priceUSD,
          courseId: course.id,
          courseName: course.title
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe price');
      }

      const { priceId } = await response.json();
      setStripePriceId(priceId);
      return priceId;
    } catch (error) {
      console.error('Error creating Stripe price:', error);
      toast.error('Failed to create price in Stripe');
      throw error;
    }
  };

  // Function to create Flouci payment
  const createFlouciPayment = async () => {
    try {
      const response = await fetch('/api/create-flouci-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: priceTND,
          courseId: course.id,
          userId: user?.uid
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create Flouci payment');
      }

      const { paymentUrl } = await response.json();
      return paymentUrl;
    } catch (error) {
      console.error('Error creating Flouci payment:', error);
      toast.error('Failed to create payment in Flouci');
      throw error;
    }
  };

  // Add function to handle course purchase
  const handlePurchaseCourse = async (courseId: string, paymentMethod: 'stripe' | 'flouci') => {
    try {
      if (!user) {
        router.push('/login');
        return;
      }

      if (paymentMethod === 'stripe' && stripePriceId) {
        // Handle Stripe payment
        const response = await fetch('/.netlify/functions/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: stripePriceId,
            userId: user.uid,
            courseId: courseId,
            mode: 'payment'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { sessionId } = await response.json();
        window.location.href = `https://checkout.stripe.com/c/pay/${sessionId}`;
      } else if (paymentMethod === 'flouci') {
        // Handle Flouci payment
        const response = await fetch('/api/create-flouci-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: priceTND,
            courseId: courseId,
            userId: user.uid
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create Flouci payment');
        }

        const { paymentUrl } = await response.json();
        window.location.href = paymentUrl;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase');
    }
  };

  // Add verification function
  const verifyPurchase = async (sessionId: string, paymentMethod: 'stripe' | 'flouci') => {
    try {
      const endpoint = paymentMethod === 'stripe' 
        ? '/.netlify/functions/verify-purchase'
        : '/api/verify-flouci-payment';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId,
          courseId: course.id,
          userId: user?.uid
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify purchase');
      }

      const data = await response.json();
      return data.isPurchaseValid;
    } catch (error) {
      console.error('Verification error:', error);
      return false;
    }
  };

  // Add useEffect to check URL parameters for payment verification
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const paymentMethod = searchParams.get('payment_method');

    if (sessionId && paymentMethod) {
      verifyPurchase(sessionId, paymentMethod as 'stripe' | 'flouci')
        .then(isValid => {
          if (isValid) {
            toast.success('Payment successful!');
            router.push(`/courses/${course.id}`);
          } else {
            toast.error('Payment verification failed');
          }
        });
    }
  }, [searchParams]);

  const handleAccessTypeChange = (value: 'free' | 'paid' | 'subscription') => {
    setAccessType(value);
    if (value === 'free') {
      setStripePriceId('');
      setPriceUSD(0);
      setPriceTND(0);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSaveCourse = async () => {
    try {
      setIsLoading(true);
      
      const updates: Partial<Course> = {
        ...course,
        updatedAt: new Date().toISOString()
      };

      if (onSave) {
        await onSave(updates as Course);
      }

      toast.success('Course updated successfully');
    } catch (error) {
      console.error('Error updating course:', error);
      setError(error instanceof Error ? error : new Error('Failed to update course'));
      toast.error('Failed to update course');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-background text-foreground">
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600"
          >
            {mounted && (
              theme === 'dark' ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-300" />
              )
            )}
          </Button>
        </div>
        <div className="w-full bg-black dark:bg-black">
          {activeVideo ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full"
                src={activeVideo}
                onClick={togglePlayPause}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <div className="flex items-center justify-between mb-2">
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={([value]) => handleSeek(value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button size="icon" variant="ghost" onClick={togglePlayPause}>
                      {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={skipBackward}>
                      <SkipBack className="h-6 w-6" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={skipForward}>
                      <SkipForward className="h-6 w-6" />
                    </Button>
                    <span className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="icon" variant="ghost" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                    </Button>
                    <Slider
                      value={[volume]}
                      max={1}
                      step={0.1}
                      onValueChange={([value]) => handleVolumeChange(value)}
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-64 flex items-center justify-center bg-gray-800 dark:bg-gray-800">
              <p className="text-gray-400 dark:text-gray-400">No video selected</p>
            </div>
          )}
        </div>
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-8 text-orange-500 dark:text-orange-500">Course Creator</h1>
          
          {isAdmin && (
            <div className="mb-6 space-y-4">
              {/* Course Title Input */}
              <div>
                <Label htmlFor="course-title">Course Title</Label>
                <Input
                  id="course-title"
                  value={course.title}
                  onChange={(e) => setCourse(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-gray-800 text-white"
                />
              </div>

              {/* Access Type Selection */}
              <div>
                <Label htmlFor="access-type">Access Type</Label>
                <select
                  id="access-type"
                  value={accessType}
                  onChange={(e) => handleAccessTypeChange(e.target.value as 'free' | 'paid' | 'subscription')}
                  className="w-full bg-gray-800 text-white p-2 rounded"
                  aria-label="Select Access Type"
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid (One-time)</option>
                  <option value="subscription">Subscription Required</option>
                </select>
              </div>

              {accessType === 'paid' && (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'flouci')}
                      className="w-full bg-gray-800 text-white p-2 rounded"
                      aria-label="Select Payment Method"
                    >
                      <option value="stripe">Stripe (USD)</option>
                      <option value="flouci">Flouci (TND)</option>
                    </select>
                  </div>

                  {paymentMethod === 'stripe' && (
                    <div>
                      <Label htmlFor="price-usd">Price (USD)</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="price-usd"
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceUSD}
                          onChange={(e) => setPriceUSD(Number(e.target.value))}
                          className="bg-gray-800 text-white"
                        />
                        <Button
                          onClick={async () => {
                            try {
                              const newPriceId = await createStripePrice();
                              setStripePriceId(newPriceId);
                              toast.success('Price created successfully');
                            } catch {
                              // Error already handled in createStripePrice
                            }
                          }}
                        >
                          Create Price
                        </Button>
                      </div>
                      {stripePriceId && (
                        <div className="mt-2 text-sm text-gray-400">
                          Price ID: {stripePriceId}
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'flouci' && (
                    <div>
                      <Label htmlFor="price-tnd">Price (TND)</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="price-tnd"
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceTND}
                          onChange={(e) => setPriceTND(Number(e.target.value))}
                          className="bg-gray-800 text-white"
                        />
                        <Button
                          onClick={async () => {
                            try {
                              const paymentUrl = await createFlouciPayment();
                              // Store the payment URL or handle it as needed
                              toast.success('Payment setup successful');
                            } catch {
                              // Error already handled in createFlouciPayment
                            }
                          }}
                        >
                          Setup Payment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Content Access Check */}
          {!isAdmin && accessType === 'subscription' && !hasSubscription && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
              <p className="font-bold">Subscription Required</p>
              <p>You need an active subscription to access this content.</p>
              <Button 
                onClick={() => router.push('/pricing-plan')}
                className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                View Subscription Plans
              </Button>
            </div>
          )}

          {/* Show content only if user has access */}
          {(isAdmin || accessType === 'free' || (accessType === 'subscription' && hasSubscription)) && (
            <>
              {isAdmin && (
                <Button onClick={addChapter} className="mb-6 bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" /> Add Chapter
                </Button>
              )}

              <Accordion type="single" collapsible className="w-full">
                {Array.isArray(course.chapters) && course.chapters.map((chapter, chapterIndex) => (
                  <AccordionItem 
                    value={`chapter-${chapterIndex}`} 
                    key={chapterIndex} 
                    className="border-gray-700"
                  >
                    <AccordionTrigger className="text-gray-300 hover:text-orange-500">
                      {chapter.title}
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                          <CardTitle>
                            {isAdmin ? (
                              <Input
                                value={chapter.title}
                                onChange={(e) => {
                                  const newChapters = [...course.chapters]
                                  newChapters[chapterIndex].title = e.target.value
                                  setCourse(prev => ({ ...prev, chapters: newChapters }))
                                }}
                                placeholder="Chapter title"
                                className="bg-gray-700 border-gray-600 text-gray-100"
                              />
                            ) : (
                              <h3>{chapter.title}</h3>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isAdmin && (
                            <div className="flex space-x-2 mb-4">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button onClick={() => addContent(chapterIndex)} className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="mr-2 h-4 w-4" /> Add Content
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-gray-800 text-gray-100">
                                  <DialogHeader>
                                    <DialogTitle>Add Content from S3</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="content-type" className="text-right">
                                        Type
                                      </Label>
                                      <select
                                        id="content-type"
                                        value={newContentType}
                                        onChange={(e) => setNewContentType(e.target.value as 'video' | 'file')}
                                        className="col-span-3 bg-gray-700 border-gray-600 text-gray-100 rounded-md"
                                        aria-label="Content Type"
                                      >
                                        <option value="video">Video</option>
                                        <option value="file">File</option>
                                      </select>
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="content-name" className="text-right">
                                        Name
                                      </Label>
                                      <Input
                                        id="content-name"
                                        value={newContentName}
                                        onChange={(e) => setNewContentName(e.target.value)}
                                        className="col-span-3 bg-gray-700 border-gray-600 text-gray-100"
                                      />
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4">
                                      <Label htmlFor="file-upload" className="text-right">Upload File</Label>
                                      <Input
                                        id="file-upload"
                                        type="file"
                                        accept={newContentType === 'video' ? 'video/*' : '*/*'}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0]
                                          if (file) {
                                            handleFileUpload(file)
                                          }
                                        }}
                                        className="col-span-3 bg-gray-700 border-gray-600 text-gray-100"
                                      />
                                    </div>

                                    {isUploading && (
                                      <div className="col-span-4">
                                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                                          <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${uploadProgress}%` }}
                                          ></div>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-2">
                                          Uploading... {uploadProgress}%
                                        </p>
                                      </div>
                                    )}

                                    {newContentUrl && (
                                      <div className="col-span-4">
                                        <p className="text-sm text-gray-400">File URL:</p>
                                        <code className="block bg-gray-900 p-2 rounded mt-1 text-xs break-all">
                                          {newContentUrl}
                                        </code>
                                      </div>
                                    )}
                                  </div>

                                  <Button 
                                    onClick={handleAddContent}
                                    disabled={isUploading || !newContentUrl}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    {isUploading ? 'Uploading...' : 'Add Content'}
                                  </Button>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}

                          {chapter.content.map((item, contentIndex) => (
                            <div key={contentIndex} className="flex items-center justify-between py-2 border-b border-gray-700">
                              <button
                                onClick={() => item.type === 'video' && handleVideoClick(item.url)}
                                className="flex items-center text-gray-300 hover:text-orange-500"
                              >
                                {item.type === 'video' ? (
                                  <Play className="mr-2 h-4 w-4" />
                                ) : (
                                  <File className="mr-2 h-4 w-4" />
                                )}
                                <span>{item.name}</span>
                              </button>
                              {isAdmin && (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => removeContent(chapterIndex, contentIndex)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}

export default DomestikaCourseCreator;