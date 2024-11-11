'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from "../ui/ui/card";
import { Slider } from "../ui/ui/slider";
import { Button } from "../ui/button";
import { Volume2, VolumeX, Play, Pause, Settings, Maximize } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cacheManager } from '../../../../lib/cache-manager';
import { VideoService } from '../../../../lib/video-service';

interface VideoPlayerProps {
  url: string;
  thumbnailUrl?: string;
  onProgress?: (progress: number) => void;
  autoPlay?: boolean;
  onLoadStart?: () => void;
  onLoaded?: () => void;
}

export function VideoPlayer({ url, thumbnailUrl, onProgress, autoPlay = false, onLoadStart, onLoaded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [quality, setQuality] = useState<'auto' | 'low' | 'medium' | 'high'>('auto');
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);

  // التحميل المسبق والتخزين المؤقت
  useEffect(() => {
    const preloadVideo = async () => {
      try {
        onLoadStart?.();
        setIsLoading(true);
        
        // 1. التحقق من وجود الفيديو في التخزين المؤقت
        const cacheKey = `video_${url}_${quality}`;
        let videoUrl = cacheManager.get(cacheKey);

        if (!videoUrl) {
          // 2. إذا لم يكن موجوداً، قم بتحميله وتخزينه
          videoUrl = await VideoService.getVideoUrl(url, { quality });
          cacheManager.set(cacheKey, videoUrl, 3600); // تخزين لمدة ساعة
          
          // 3. تحميل مسبق للجودة التالية
          if (quality === 'low') {
            await VideoService.preloadQuality(url, 'medium');
          } else if (quality === 'medium') {
            await VideoService.preloadQuality(url, 'high');
          }
        }

        if (videoRef.current) {
          videoRef.current.src = videoUrl;
        }
        
        onLoaded?.();
      } catch (error) {
        console.error('Error preloading video:', error);
      } finally {
        setIsLoading(false);
      }
    };

    preloadVideo();
  }, [url, quality, onLoadStart, onLoaded]);

  // تحديث التقدم والتخزين المؤقت
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      setCurrentTime(video.currentTime);
      setBuffered(video.buffered);
      
      if (onProgress) {
        onProgress((video.currentTime / video.duration) * 100);
      }

      // حفظ موقع التشغيل في التخزين المؤقت
      cacheManager.set(`video_progress_${url}`, video.currentTime, 86400); // حفظ لمدة يوم
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [url, onProgress]);

  return (
    <Card className="relative w-full aspect-video bg-black/95 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        poster={thumbnailUrl}
        playsInline
        preload="metadata"
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress Bar */}
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          className="mb-4"
          onValueChange={([value]) => {
            if (videoRef.current) {
              videoRef.current.currentTime = value;
            }
          }}
        />

        <div className="flex items-center justify-between">
          {/* Play/Pause Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (videoRef.current) {
                if (isPlaying) {
                  videoRef.current.pause();
                } else {
                  videoRef.current.play();
                }
                setIsPlaying(!isPlaying);
              }
            }}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
            >
              {volume === 0 ? (
                <VolumeX className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </Button>
            <Slider
              value={[volume * 100]}
              max={100}
              className="w-24"
              onValueChange={([value]) => {
                const newVolume = value / 100;
                setVolume(newVolume);
                if (videoRef.current) {
                  videoRef.current.volume = newVolume;
                }
              }}
            />
          </div>

          {/* Quality Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setQuality('auto')}>
                تلقائي
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQuality('low')}>
                جودة منخفضة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQuality('medium')}>
                جودة متوسطة
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQuality('high')}>
                جودة عالية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}