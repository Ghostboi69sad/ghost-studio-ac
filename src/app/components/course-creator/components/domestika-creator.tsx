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
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
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
import { uploadToS3, getPresignedUploadUrl } from '../../../../lib/aws-config';
import { Loader2 } from 'lucide-react';
import { showToast } from '../../../../lib/toast';

import { saveCourseToDatabase } from '../lib/course-operations';
import { handleSubscriptionAccess } from '../lib/subscription-handlers/subscription-service';
import { useSubscriptionStatus } from '../hooks/use-subscription';
import EnhancedVideoPlayer from './EnhancedVideoPlayer'
import { cacheManager } from '../../../lib/cache-manager';

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
  const S3_BUCKET_URL = 'https://ghost-studio.s3.eu-north-1.amazonaws.com';

  // Function to handle S3 file upload
  const handleFileUpload = async (file: File) => {
    try {
      if (!isAdmin) {
        toast.error('لا تملك الصلاحيات الكافية لرفع الملفات');
        return;
      }

      if (!newContentName) {
        toast.error('الرجاء إدخال عنوان للمتوى');
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      const fileExtension = file.name.split('.').pop();
      const fileKey = `videos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

      const { uploadUrl, url } = await getPresignedUploadUrl(fileKey, file.type);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-amz-server-side-encryption': 'AES256'
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('فشل رفع الملف');
      }

      setNewContentUrl(url);
      setUploadProgress(100);
      toast.success('تم رفع الملف بنجاح');
    } catch (error) {
      console.error('خطأ في الرفع:', error);
      toast.error(error instanceof Error ? error.message : 'فشل رفع الملف');
    } finally {
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
    if (activeChapterIndex === null || !newContentUrl || !newContentName) return;

    const newContent: ContentItem = {
      id: `content-${Date.now()}`,
      type: newContentType,
      name: newContentName,
      url: newContentUrl
    };

    setCourse(prev => {
      const newChapters = [...prev.chapters];
      if (!newChapters[activeChapterIndex].content) {
        newChapters[activeChapterIndex].content = [];
      }
      if (!newChapters[activeChapterIndex].content.some(item => item.url === newContentUrl)) {
        newChapters[activeChapterIndex].content.push(newContent);
        return {
          ...prev,
          chapters: newChapters,
          videoCount: newContentType === 'video' ? prev.videoCount + 1 : prev.videoCount
        };
      }
      return prev;
    });

    setNewContentUrl('');
    setNewContentName('');
    setActiveChapterIndex(null);
  };

  const removeContent = (chapterIndex: number, contentIndex: number) => {
    // إيقاف فقاعة الحدث
    event?.preventDefault();
    event?.stopPropagation();

    // تأكيد الحذف
    if (!window.confirm('هل أنت متأكد من حذف هذا المحتوى؟')) {
      return;
    }

    setCourse((prev) => {
      const newChapters = [...prev.chapters];
      const chapter = newChapters[chapterIndex];
      
      if (!chapter.content) {
        chapter.content = [];
        return { ...prev, chapters: newChapters };
      }

      const removedItem = chapter.content[contentIndex];
      chapter.content.splice(contentIndex, 1);
      
      return {
        ...prev,
        chapters: newChapters,
        videoCount: removedItem?.type === 'video' ? 
          Math.max((prev.videoCount || 0) - 1, 0) : 
          (prev.videoCount || 0)
      };
    });
  };

  // Function to handle video URL processing
  const handleVideoClick = async (url: string) => {
    try {
      const cacheKey = `video_url_${url}`;
      let videoUrl = cacheManager.get(cacheKey);

      if (!videoUrl) {
        videoUrl = await getMediaUrl(url, { useSignedUrl: true });
        cacheManager.set(cacheKey, videoUrl, 3600 * 1000);
      }

      setActiveVideo(videoUrl);
      setIsPlaying(true);
      
      if (videoRef.current) {
        videoRef.current.src = videoUrl;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error loading video:', error);
      toast.error('فشل في تحميل الفيديو');
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
    const checkAccess = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // في بيئة التطوير، نعتبر المستخدم مشرفاً
        if (process.env.NODE_ENV === 'development') {
          setIsAdmin(true);
          return;
        }

        if (user.role === 'admin') {
          setIsAdmin(true);
          return;
        }

        // التحقق من حالة الاشتراك للمستخدمين العاديين
        const response = await fetch('/api/subscription/check-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await user.getIdToken()}`
          },
          body: JSON.stringify({
            courseId: initialCourse.id,
            userId: user.uid
          })
        });

        const data = await response.json();
        
        if (!data.courseAccess && !data.isValid) {
          toast.error('يجب أن يكون لديك اتراك نشط للوصول إلى هذا المحتوى');
          router.push('/pricing');
        }
      } catch (error) {
        console.error('خطأ في التحقق من الوصول:', error);
        toast.error('حدث خطأ ي التحقق م صلحيات الوصول');
        router.push('/login');
      }
    };

    checkAccess();
  }, [user, router, initialCourse.id]);

  const [isLoading, setIsLoading] = useState(false);

  const saveCourseChanges = async () => {
    try {
      const courseUpdate = {
        accessType: accessType,
        isPublic: isPublic,
        chapters: course.chapters?.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          content: chapter.content || [],
          order: chapter.order || 0,
          lessons: chapter.lessons || [],
        })) || [],
        videoCount: course.chapters?.reduce((acc, chapter) => 
          acc + (chapter.content?.filter(item => item.type === 'video')?.length || 0), 0
        ) || 0,
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

  const handleCourseUpdate = async (updates: Partial<CourseUpdate>) => {
    try {
      const updatedCourse = {
        ...course,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || ''
      };
      
      setCourse(updatedCourse);
      await saveCourseToDatabase(course, updates);
      toast.success('تم تحديث الدورة بنجاح');
    } catch (error) {
      console.error('خطأ في تحديث الدورة:', error);
      toast.error('فشل في تحديث الدورة');
    }
  };

  const handleAccessTypeUpdate = async (value: AccessType) => {
    setAccessType(value);
    
    if (value === 'subscription') {
      const hasAccess = await handleSubscriptionAccess(course.id, user?.uid || '');
      if (!hasAccess) {
        toast.error('لا يمكن تعيين الدورة كاشتراك - تحقق من صلاحيات الوصول');
        return;
      }
    }
    
    await handleCourseUpdate({ 
      accessType: value,
      subscriptionType: value,
      isPublic: course.isPublic,
      price: course.price,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.uid || ''
    });
  };

  // عرض حالة التحميل
  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
          <p className="text-lg">جري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  // التحقق من الوصول
  if (!isAdmin && !hasSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">غير مصرح باوصول</h2>
          <p className="text-yellow-800 dark:text-yellow-200 mb-4">
            يجب ن يكون لديك شراك نشط للوصول إلى هذا المحتوى
          </p>
          <Button onClick={() => router.push('/pricing')} className="mt-2">
            عرض خطط الاشتر
          </Button>
        </div>
      </div>
    );
  }

  // إضافة دالة updateProgress
  const updateProgress = async (progress: number) => {
    if (!user || !course) return;

    try {
      const progressRef = ref(database, `progress/${user.uid}/${course.id}`);
      await update(progressRef, {
        progress,
        lastAccessed: new Date().toISOString(),
      });
    } catch (error) {
      console.error('خطأ في تحديث التقدم:', error);
      toast.error('فشل في تحديث التقدم');
    }
  };

  return (
    <ThemeProvider attribute='class' defaultTheme='dark' enableSystem>
      <div className='flex h-screen bg-background'>
        {/* القائمة الجانبية للفصول */}
        <div className='w-1/4 h-full overflow-y-auto border-r border-gray-800 p-4 bg-gray-900'>
          {isAdmin && (
            <div className='space-y-4 mb-6'>
              <div>
                <Label htmlFor='course-title'>عنوان الدورة</Label>
                <Input
                  id='course-title'
                  value={course.title}
                  onChange={(e) => setCourse((prev) => ({ ...prev, title: e.target.value }))}
                  className='bg-gray-800 text-white'
                />
              </div>

              <div>
                <Label htmlFor='access-type'>نوع الوصول</Label>
                <select
                  id='access-type'
                  name='access-type'
                  aria-label='اختر نوع الوصول للدورة'
                  value={accessType}
                  onChange={(e) => handleAccessTypeUpdate(e.target.value as AccessType)}
                  className='w-full bg-gray-800 text-white p-2 rounded'
                >
                  <option value='free'>مجاني</option>
                  <option value='subscription'>يتطلب اشتراك</option>
                </select>
              </div>

              <Button onClick={addChapter} className='w-full bg-orange-500 hover:bg-orange-600'>
                <Plus className='mr-2 h-4 w-4' /> إضافة فصل
              </Button>
            </div>
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
                                    قم باختيار نوع المحتوى وتحميل الملف لمطلوب
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

                        {chapter?.content ? (
                          chapter.content.map((item, contentIndex) => (
                            <div
                              key={`${chapter.id}-content-${contentIndex}`}
                              className='flex items-center justify-between py-2 border-b border-gray-700'
                            >
                              <button
                                onClick={() => item.type === 'video' && handleVideoClick(item.url)}
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeContent(chapterIndex, contentIndex);
                                  }}
                                  className='bg-red-600 hover:bg-red-700'
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500">لا يوجد محتوى في هذا الفصل</p>
                        )}
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        </div>

        {/* منطقة عرض الفيديو */}
        <div className='flex-1 h-full bg-black'>
          {activeVideo ? (
            <EnhancedVideoPlayer
              src={activeVideo}
              thumbnailUrl={course.thumbnail}
              onProgress={(progress) => {
                console.log(`Video progress: ${progress}%`);
                updateProgress(progress);
              }}
              autoPlay={true}
              onLoadStart={() => setIsLoading(true)}
              onLoaded={() => setIsLoading(false)}
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center'>
              <p className='text-gray-400'>اختر فيديو للمشاهدة</p>
            </div>
          )}
        </div>

        {/* زر حفظ التغييرات للمشرف */}
        {isAdmin && (
          <div className='fixed bottom-4 right-4 z-50'>
            <Button
              onClick={saveCourseChanges}
              disabled={isLoading}
              className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg'
            >
              {isLoading ? (
                <div className='flex items-center gap-2'>
                  <Loader2 className='animate-spin' />
                  جاري الحفظ...
                </div>
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

export default DomestikaCourseCreator;
