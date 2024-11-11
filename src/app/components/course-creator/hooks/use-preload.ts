import { useEffect } from 'react';
import { VideoService } from '../../../lib/video-service';

export function usePreload(urls: string[], options = {}) {
  useEffect(() => {
    urls.forEach(url => {
      VideoService.preloadVideo(url, options);
    });
  }, [urls]);
} 