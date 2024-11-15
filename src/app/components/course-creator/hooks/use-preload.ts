import { useEffect } from 'react';
import { VideoService } from '../../../lib/video-service';

interface PreloadOptions {
  quality?: 'auto' | 'low' | 'medium' | 'high';
  useBackup?: boolean;
  isPublic?: boolean;
}

export function usePreload(urls: string[], options: PreloadOptions = {}) {
  useEffect(() => {
    const preloadVideos = async () => {
      try {
        await Promise.all(urls.map((url) => VideoService.preloadVideo(url, options)));
      } catch (error) {
        console.error('Error preloading videos:', error);
      }
    };

    preloadVideos();

    return () => {
      VideoService.clearPreloadCache();
    };
  }, [urls, options]);
}
