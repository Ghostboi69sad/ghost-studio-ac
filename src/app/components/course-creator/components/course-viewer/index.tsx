'use client';

import { useState } from 'react';
import { Card } from "../../components/ui/ui/card";
import { ScrollArea } from "../../components/ui/ui/scroll-area";
import { VideoPlayer } from '../video-player/index';
import { Course, ContentItem } from '../../types/course';
import { Button } from "../../components/ui/ui/button";
import { ChevronRight, Video, File, Lock } from 'lucide-react';
import { VideoService } from '../../../../lib/video-service';
import { toast } from 'react-hot-toast';


interface CourseViewerProps {
  course: Course;
  onVideoSelect: (url: string) => void;
}

export function CourseViewer({ course, onVideoSelect }: CourseViewerProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVideoClick = async (url: string) => {
    try {
      setIsLoading(true);
      const videoUrl = await VideoService.getVideoUrl(url);
      setActiveVideoUrl(videoUrl);
      await onVideoSelect(videoUrl);
    } catch (error) {
      console.error('Error loading video:', error);
      toast.error('فشل في تحميل الفيديو');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-4rem)]">
      <div className="col-span-9">
        <Card className="h-full">
          {activeVideoUrl ? (
            <VideoPlayer
              url={activeVideoUrl}
              thumbnailUrl={course.thumbnail}
              onLoadStart={() => setIsLoading(true)}
              onLoaded={() => setIsLoading(false)}
              autoPlay={true}
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
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-gray-100">{course.title}</h2>
            <p className="text-sm text-gray-400 mt-2">{course.description}</p>
          </div>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-4">
              {course.chapters?.map((chapter, index) => (
                <div key={chapter.id} className="mb-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-gray-300 hover:text-orange-500"
                    onClick={() => setActiveChapterIndex(index)}
                  >
                    <span>{chapter.title}</span>
                    <ChevronRight className={`transform transition-transform ${
                      activeChapterIndex === index ? 'rotate-90' : ''
                    }`} />
                  </Button>
                  
                  {activeChapterIndex === index && chapter.content?.length > 0 && (
                    <div className="mt-2 space-y-2 pl-4">
                      {chapter.content.map((item: ContentItem) => (
                        <Button
                          key={item.id}
                          variant="ghost"
                          className="w-full justify-start gap-2 text-gray-400 hover:text-orange-500"
                          onClick={() => item.type === 'video' && handleVideoClick(item.url)}
                        >
                          {item.type === 'video' ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <File className="h-4 w-4" />
                          )}
                          <span>{item.name}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}