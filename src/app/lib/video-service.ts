import { getMediaUrl } from '../components/course-creator/lib/aws/cloudfront-config';
import { cacheManager } from './cache-manager';

export class VideoService {
  private static readonly CACHE_TTL = 1000 * 60 * 60; // ساعة واحدة
  private static readonly METADATA_CACHE_TTL = 1000 * 60 * 60 * 24; // يوم كامل
  private static preloadCache = new Map<string, HTMLVideoElement>();

  static async getVideoUrl(
    key: string,
    options: {
      useBackup?: boolean;
      isPublic?: boolean;
      quality?: 'auto' | 'low' | 'medium' | 'high';
    } = {}
  ): Promise<string> {
    const cacheKey = `video_url_${key}_${options.quality || 'auto'}_${options.useBackup ? 'backup' : 'main'}_${options.isPublic ? 'public' : 'private'}`;
    const cachedUrl = cacheManager.get(cacheKey);
    if (cachedUrl) return cachedUrl;

    try {
      const url = await getMediaUrl(key, options);
      cacheManager.set(cacheKey, url, this.CACHE_TTL);
      return url;
    } catch (error) {
      console.error('Error getting video URL:', error);
      throw error;
    }
  }

  static async preloadQuality(key: string, quality: 'low' | 'medium' | 'high') {
    if (typeof window === 'undefined') return;

    try {
      const url = await this.getVideoUrl(key, { quality });
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = url;
      document.head.appendChild(link);

      // تخزين البيانات الوصفية
      const response = await fetch(url, { method: 'HEAD' });
      const metadata = {
        size: response.headers.get('content-length'),
        type: response.headers.get('content-type'),
        quality,
      };

      cacheManager.set(`metadata_${key}_${quality}`, metadata, this.METADATA_CACHE_TTL);
    } catch (error) {
      console.error('Error preloading quality:', error);
    }
  }

  static async preloadVideo(
    url: string,
    options: {
      quality?: 'auto' | 'low' | 'medium' | 'high';
      useBackup?: boolean;
      isPublic?: boolean;
    } = {}
  ) {
    if (typeof window === 'undefined') return;

    try {
      if (this.preloadCache.has(url)) {
        return this.preloadCache.get(url);
      }

      const videoUrl = await this.getVideoUrl(url, options);

      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = videoUrl;

      this.preloadCache.set(url, video);

      if (options.quality && options.quality !== 'auto') {
        await this.preloadQuality(url, options.quality);
      }

      return video;
    } catch (error) {
      console.error('Error preloading video:', error);
      throw error;
    }
  }

  static clearPreloadCache() {
    this.preloadCache.clear();
  }
}
