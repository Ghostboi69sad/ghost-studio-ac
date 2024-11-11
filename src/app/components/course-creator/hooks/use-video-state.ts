import { useCallback, useEffect, useRef, useState } from 'react';

export const useVideoState = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.volume = value;
    setVolume(value);
    setIsMuted(value === 0);
  }, []);

  const handleSeek = useCallback((value: number) => {
    if (!videoRef.current) return;
    
    videoRef.current.currentTime = value;
    setCurrentTime(value);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    setCurrentTime(videoRef.current.currentTime);
    setBuffered(videoRef.current.buffered);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    setDuration(videoRef.current.duration);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('play', () => setIsPlaying(true));
    video.addEventListener('pause', () => setIsPlaying(false));
    video.addEventListener('volumechange', () => setVolume(video.volume));
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('play', () => setIsPlaying(true));
      video.removeEventListener('pause', () => setIsPlaying(false));
      video.removeEventListener('volumechange', () => setVolume(video.volume));
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [handleTimeUpdate, handleLoadedMetadata]);

  return {
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    buffered,
    handlePlayPause,
    handleVolumeChange,
    handleSeek,
    handleTimeUpdate,
    handleLoadedMetadata,
  };
}; 