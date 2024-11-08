'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, database } from '../../../lib/firebase';
import { ref, set, push, get, update, serverTimestamp } from 'firebase/database';
import {
  Plus,
  Trash2,
  File,
  Video,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from './ui/ui/button';
import { Input } from './ui/ui/input';
import { Label } from './ui/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/ui/accordion';
import { Slider } from './ui/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from './ui/ui/dialog';
import { cn } from '../lib/utils';
import { toast } from 'react-toastify';
// Import types from course.d.ts
import type { Course, Chapter, ContentItem, AccessType, CourseUpdate } from '../types/course';
import { useAuth } from '../../../lib/auth-context';
import { ThemeProvider, useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { getMediaUrl } from '../lib/aws/cloudfront-config';
import { DomestikaCourseCreatorProps } from '../types/course';
import { uploadToS3 } from '../lib/s3';
import { Loader2 } from 'lucide-react';
import { showToast } from '../../../../lib/toast';

import { saveCourseToDatabase } from '../lib/course-operations';
import { handleSubscriptionAccess } from '../lib/subscription-handlers/subscription-service';
import { useSubscriptionStatus } from '../hooks/use-subscription';

const DomestikaCourseCreator: React.FC<DomestikaCourseCreatorProps> = ({
  initialCourse,
  onSave,
}) => {
  // الحالات الأساسية
  const [course, setCourse] = useState<Course>(initialCourse);
  const [accessType, setAccessType] = useState<AccessType>(
    initialCourse.accessType === 'subscription' ? 'subscription' : 'free'
  );
  const [isPublic, setIsPublic] = useState<boolean>(initialCourse.isPublic);

  // حالات الاشتراك
  const { hasSubscription, isLoading: subscriptionLoading } = useSubscriptionStatus();

  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [newContentUrl, setNewContentUrl] = useState('');
  const [newContentName, setNewContentName] = useState('');
  const [newContentType, setNewContentType] = useState<'video' | 'file'>('video');
  const [activeChapterIndex, setActiveChapterIndex] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  // Add theme toggle state
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Add S3 upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const searchParams = useSearchParams();

  // Add at the top with other imports
  const S3_BUCKET_URL = 'https://your-bucket-name.s3.your-region.amazonaws.com';

  // Function to handle S3 file upload
  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setIsUploading(true);
      setUploadProgress(0);

      // 1. احصل على URL موقع للرفع
      const response = await fetch('/api/get-upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, url, fileKey } = await response.json();

      // 2. ارفع الملف مباشرة إلى S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // 3. استخدم URL CloudFront المُرجع
      setNewContentUrl(url);
      setNewContentName(file.name);
      setNewContentType(file.type.startsWith('video/') ? 'video' : 'file');

      toast.success('تم رفع الملف بنجاح');
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('فشل رفع الملف');
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  // Handle initial client-side render
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateTime = () => setCurrentTime(videoElement.currentTime);
    const updateDuration = () => setDuration(videoElement.duration);

    videoElement.addEventListener('timeupdate', updateTime);
    videoElement.addEventListener('loadedmetadata', updateDuration);

    return () => {
      videoElement.removeEventListener('timeupdate', updateTime);
      videoElement.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [activeVideo]);

  const addChapter = () => {
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: `Chapter ${course.chapters?.length + 1 || 1}`,
      order: course.chapters?.length + 1 || 1,
      content: [],
      lessons: [],
    };

    setCourse((prev) => ({
      ...prev,
      chapters: [...(prev.chapters || []), newChapter],
    }));
  };

  const addContent = (chapterIndex: number) => {
    setActiveChapterIndex(chapterIndex);
  };

  const handleAddContent = async () => {
    if (activeChapterIndex === null) return;

    const fullUrl = newContentUrl.startsWith('http')
      ? newContentUrl
      : `${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${newContentUrl}`;

    const newContent: ContentItem = {
      id: `content-${Date.now()}`,
      type: newContentType,
      name: newContentName,
      url: fullUrl,
    };

    setCourse((prev) => {
      const newChapters = [...prev.chapters];
      newChapters[activeChapterIndex].content.push(newContent);
      return {
        ...prev,
        chapters: newChapters,
        videoCount: newContentType === 'video' ? prev.videoCount + 1 : prev.videoCount,
      };
    });

    setNewContentUrl('');
    setNewContentName('');
    setActiveChapterIndex(null);

    await saveCourseChanges();
  };

  const removeContent = (chapterIndex: number, contentIndex: number) => {
    setCourse((prev) => {
      const newChapters = [...prev.chapters];
      newChapters[chapterIndex].content.splice(contentIndex, 1);
      return { ...prev, chapters: newChapters };
    });
  };

  // Function to handle video URL processing
  const handleVideoClick = (url: string) => {
    const cloudFrontUrl = getMediaUrl(url);
    setActiveVideo(cloudFrontUrl);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.src = cloudFrontUrl;
      videoRef.current.play();
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (value: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value;
      setVolume(value);
      setIsMuted(value === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Check user role on component mount
  useEffect(() => {
    const checkUserAuth = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const token = await user.getIdToken(true);
        if (!token) {
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('خطأ في التحقق من المستخدم:', error);
        router.push('/login');
      }
    };

    checkUserAuth();
  }, [user, router]);

  const [isLoading, setIsLoading] = useState(false);

  const saveCourseChanges = async () => {
    try {
      const courseUpdate = {
        accessType: accessType,
        isPublic: isPublic,
        chapters:
          course.chapters?.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            order: chapter.order || 0,
            lessons: chapter.lessons || [],
          })) || [],
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || '',
      };

      await saveCourseToDatabase(course, courseUpdate);
      toast.success('تم حفظ الدورة بنجاح');
      onSave?.(course);
    } catch (error) {
      console.error('خطأ في حفظ الدورة:', error);
      toast.error('فشل في حفظ الدورة');
    }
  };

  const handleAccessTypeUpdate = (value: AccessType) => {
    setAccessType(value);
    if (value === 'subscription') {
      handleSubscriptionAccess(course.id, user?.uid || '');
    }
  };

  return (
    <ThemeProvider attribute='class' defaultTheme='dark' enableSystem>
      <div className='min-h-screen bg-background text-foreground'>
        <div className='fixed top-4 right-4 z-50'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className='rounded-full bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600'
          >
            {mounted &&
              (theme === 'dark' ? (
                <Sun className='h-5 w-5 text-yellow-500' />
              ) : (
                <Moon className='h-5 w-5 text-gray-300' />
              ))}
          </Button>
        </div>
        <div className='w-full bg-black dark:bg-black'>
          {activeVideo ? (
            <div className='relative'>
              <video
                ref={videoRef}
                className='w-full'
                src={activeVideo}
                onClick={togglePlayPause}
              />
              <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4'>
                <div className='flex items-center justify-between mb-2'>
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={([value]) => handleSeek(value)}
                    className='w-full'
                  />
                </div>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <Button size='icon' variant='ghost' onClick={togglePlayPause}>
                      {isPlaying ? <Pause className='h-6 w-6' /> : <Play className='h-6 w-6' />}
                    </Button>
                    <Button size='icon' variant='ghost' onClick={skipBackward}>
                      <SkipBack className='h-6 w-6' />
                    </Button>
                    <Button size='icon' variant='ghost' onClick={skipForward}>
                      <SkipForward className='h-6 w-6' />
                    </Button>
                    <span className='text-sm'>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <Button size='icon' variant='ghost' onClick={toggleMute}>
                      {isMuted ? <VolumeX className='h-6 w-6' /> : <Volume2 className='h-6 w-6' />}
                    </Button>
                    <Slider
                      value={[volume]}
                      max={1}
                      step={0.1}
                      onValueChange={([value]) => handleVolumeChange(value)}
                      className='w-24'
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className='w-full h-64 flex items-center justify-center bg-gray-800 dark:bg-gray-800'>
              <p className='text-gray-400 dark:text-gray-400'>No video selected</p>
            </div>
          )}
        </div>
        <div className='max-w-4xl mx-auto p-8'>
          <h1 className='text-3xl font-bold mb-8 text-orange-500 dark:text-orange-500'>
            Course Creator
          </h1>

          {isAdmin && (
            <div className='mb-6 space-y-4'>
              {/* Course Title Input */}
              <div>
                <Label htmlFor='course-title'>Course Title</Label>
                <Input
                  id='course-title'
                  value={course.title}
                  onChange={(e) => setCourse((prev) => ({ ...prev, title: e.target.value }))}
                  className='bg-gray-800 text-white'
                />
              </div>

              {/* Access Type Selection */}
              <div>
                <Label htmlFor='access-type'>Access Type</Label>
                <select
                  id='access-type'
                  value={accessType}
                  onChange={(e) => handleAccessTypeUpdate(e.target.value as AccessType)}
                  className='w-full bg-gray-800 text-white p-2 rounded'
                  aria-label='Select Access Type'
                >
                  <option value='free'>مجاني</option>
                  <option value='subscription'>يتطلب اشتراك</option>
                </select>
              </div>
            </div>
          )}

          {subscriptionLoading ? (
            <div className='flex items-center justify-center p-4'>
              <Loader2 className='animate-spin' />
              <span className='mr-2'>جاري التحقق من الاشتراك...</span>
            </div>
          ) : (
            <>
              {!isAdmin && accessType === 'subscription' && !hasSubscription && (
                <div className='p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg'>
                  <p className='text-yellow-800 dark:text-yellow-200'>
                    يجب أن يكون لديك اشتراك نشط للوصول إلى هذا المحتوى
                  </p>
                  <Button onClick={() => router.push('/pricing')} className='mt-2'>
                    عرض خطط الاشتراك
                  </Button>
                </div>
              )}

              {(isAdmin ||
                accessType === 'free' ||
                (accessType === 'subscription' && hasSubscription)) && (
                <>
                  {isAdmin && (
                    <Button onClick={addChapter} className='mb-6 bg-orange-500 hover:bg-orange-600'>
                      <Plus className='mr-2 h-4 w-4' /> Add Chapter
                    </Button>
                  )}

                  <Accordion type='single' collapsible className='w-full'>
                    {Array.isArray(course.chapters) &&
                      course.chapters.map((chapter, chapterIndex) => (
                        <AccordionItem
                          value={`chapter-${chapterIndex}`}
                          key={chapterIndex}
                          className='border-gray-700'
                        >
                          <AccordionTrigger className='text-gray-300 hover:text-orange-500'>
                            {chapter.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            <Card className='bg-gray-800 border-gray-700'>
                              <CardHeader>
                                <CardTitle>
                                  {isAdmin ? (
                                    <Input
                                      value={chapter.title}
                                      onChange={(e) => {
                                        const newChapters = [...course.chapters];
                                        newChapters[chapterIndex].title = e.target.value;
                                        setCourse((prev) => ({ ...prev, chapters: newChapters }));
                                      }}
                                      placeholder='Chapter title'
                                      className='bg-gray-700 border-gray-600 text-gray-100'
                                    />
                                  ) : (
                                    <h3>{chapter.title}</h3>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {isAdmin && (
                                  <div className='flex space-x-2 mb-4'>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          onClick={() => addContent(chapterIndex)}
                                          className='bg-blue-600 hover:bg-blue-700'
                                        >
                                          <Plus className='mr-2 h-4 w-4' /> Add Content
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className='sm:max-w-[425px]'>
                                        <DialogHeader>
                                          <DialogTitle>إضافة محتوى جديد</DialogTitle>
                                          <DialogDescription>
                                            قم باختيار نوع المحتوى وتحميل الملف المطلوب
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className='grid gap-4 py-4'>
                                          <div className='grid grid-cols-4 items-center gap-4'>
                                            <Label htmlFor='content-type' className='text-right'>
                                              Type
                                            </Label>
                                            <select
                                              id='content-type'
                                              value={newContentType}
                                              onChange={(e) =>
                                                setNewContentType(
                                                  e.target.value as 'video' | 'file'
                                                )
                                              }
                                              className='col-span-3 bg-gray-700 border-gray-600 text-gray-100 rounded-md'
                                              aria-label='Content Type'
                                            >
                                              <option value='video'>Video</option>
                                              <option value='file'>File</option>
                                            </select>
                                          </div>

                                          <div className='grid grid-cols-4 items-center gap-4'>
                                            <Label htmlFor='content-name' className='text-right'>
                                              Name
                                            </Label>
                                            <Input
                                              id='content-name'
                                              value={newContentName}
                                              onChange={(e) => setNewContentName(e.target.value)}
                                              className='col-span-3 bg-gray-700 border-gray-600 text-gray-100'
                                            />
                                          </div>

                                          <div className='grid grid-cols-4 items-center gap-4'>
                                            <Label htmlFor='file-upload' className='text-right'>
                                              Upload File
                                            </Label>
                                            <Input
                                              id='file-upload'
                                              type='file'
                                              accept={
                                                newContentType === 'video' ? 'video/*' : '*/*'
                                              }
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  handleFileUpload(file);
                                                }
                                              }}
                                              className='col-span-3 bg-gray-700 border-gray-600 text-gray-100'
                                            />
                                          </div>

                                          {isUploading && (
                                            <div className='col-span-4'>
                                              <div className='w-full bg-gray-700 rounded-full h-2.5'>
                                                <div
                                                  className='bg-blue-600 h-2.5 rounded-full'
                                                  style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                              </div>
                                              <p className='text-sm text-gray-400 mt-2'>
                                                Uploading... {uploadProgress}%
                                              </p>
                                            </div>
                                          )}

                                          {newContentUrl && (
                                            <div className='col-span-4'>
                                              <p className='text-sm text-gray-400'>File URL:</p>
                                              <code className='block bg-gray-900 p-2 rounded mt-1 text-xs break-all'>
                                                {newContentUrl}
                                              </code>
                                            </div>
                                          )}
                                        </div>

                                        <div className='mt-6 flex justify-end'>
                                          <Button
                                            onClick={handleAddContent}
                                            disabled={isUploading || !newContentUrl}
                                            className='bg-blue-600 hover:bg-blue-700'
                                          >
                                            {isUploading ? 'Uploading...' : 'Add Content'}
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}

                                {chapter.content.map((item, contentIndex) => (
                                  <div
                                    key={contentIndex}
                                    className='flex items-center justify-between py-2 border-b border-gray-700'
                                  >
                                    <button
                                      onClick={() =>
                                        item.type === 'video' && handleVideoClick(item.url)
                                      }
                                      className='flex items-center text-gray-300 hover:text-orange-500'
                                    >
                                      {item.type === 'video' ? (
                                        <Play className='mr-2 h-4 w-4' />
                                      ) : (
                                        <File className='mr-2 h-4 w-4' />
                                      )}
                                      <span>{item.name}</span>
                                    </button>
                                    {isAdmin && (
                                      <Button
                                        variant='destructive'
                                        size='icon'
                                        onClick={() => removeContent(chapterIndex, contentIndex)}
                                        className='bg-red-600 hover:bg-red-700'
                                      >
                                        <Trash2 className='h-4 w-4' />
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
            </>
          )}
        </div>
        <div className='fixed bottom-4 right-4 z-50'>
          <Button
            onClick={saveCourseChanges}
            disabled={isLoading}
            className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg'
          >
            {isLoading ? (
              <div className='flex items-center gap-2'>
                <span className='animate-spin'>⏳</span>
                جاري الحفظ...
              </div>
            ) : (
              'حفظ التغييرات'
            )}
          </Button>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default DomestikaCourseCreator;
