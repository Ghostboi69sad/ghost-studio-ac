'use client';

import { useState } from 'react';
import { Card } from "./ui/ui/card";
import { ScrollArea } from "./ui/ui/scroll-area";
import VideoPlayer from './video-player';
import { Course } from '../types/course';
import { useAuth } from '../../../lib/auth-context';
import { useSubscriptionStatus } from '../hooks/use-subscription';
import { toast } from 'react-hot-toast';
import { getMediaUrl } from '../lib/aws/cloudfront-config';

interface CourseCreatorProps {
  initialCourse?: Course;
}

export function CourseCreator({ initialCourse }: CourseCreatorProps) {
  const { user } = useAuth();
  const { hasSubscription, isLoading } = useSubscriptionStatus();
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  if (!user) {
    toast.error('يرجى تسجيل الدخول للوصول إلى المحتوى');
    return null;
  }

  if (!hasSubscription && !isLoading && initialCourse?.accessType === 'paid') {
    toast.error('يجب أن يكون لديك اشتراك للوصول إلى هذا المحتوى');
    return null;
  }

  const handleVideoSelect = async (url: string) => {
    try {
      setIsVideoLoading(true);
      const videoUrl = await getMediaUrl(url);
      setActiveVideoUrl(videoUrl);
    } catch (error) {
      console.error('Error loading video:', error);
      toast.error('فشل في تحميل الفيديو');
    } finally {
      setIsVideoLoading(false);
    }
  };

  return initialCourse ? (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-4rem)]">
      <div className="col-span-9">
        <Card className="h-full">
          {activeVideoUrl ? (
            <VideoPlayer
              url={activeVideoUrl}
              thumbnailUrl={initialCourse.thumbnail}
              onLoadStart={() => setIsVideoLoading(true)}
              onLoaded={() => setIsVideoLoading(false)}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-900 rounded-lg">
              <p className="text-gray-400">اختر فيديو للمشاهدة</p>
            </div>
          )}
        </Card>
      </div>

      <div className="col-span-3">
        <Card className="h-full">
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-4">
              {initialCourse.chapters?.map((chapter, index) => (
                <div key={chapter.id} className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-2">
                    {chapter.title}
                  </h3>
                  <div className="space-y-2">
                    {chapter.content?.map((item) => (
                      <button
                        key={item.id}
                        className="w-full text-left px-4 py-2 rounded hover:bg-gray-800 text-gray-300"
                        onClick={() => item.type === 'video' && handleVideoSelect(item.url)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  ) : null;
}