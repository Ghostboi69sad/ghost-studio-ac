'use client';

import React, { useState, useEffect, useRef } from 'react';

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from 'lucide-react';

import { Button } from './ui/button';
import { Slider } from './ui/ui/slider';

interface EnhancedVideoPlayerProps {
  src?: string;
  url?: string;
  thumbnailUrl?: string;
  onProgress?: (progress: number) => void;
  autoPlay?: boolean;
  onLoadStart?: () => void;
  onLoaded?: () => void;
  onLoadedMetadata?: (duration: number) => void;
}

const EnhancedVideoPlayer: React.FC<EnhancedVideoPlayerProps> = ({
  src,
  url,
  thumbnailUrl,
  onProgress,
  autoPlay = false,
  onLoadStart,
  onLoaded,
  onLoadedMetadata,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      if (onProgress) {
        onProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateTime);
    return () => video.removeEventListener('timeupdate', updateTime);
  }, [onProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play();
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    if (onLoadedMetadata) onLoadedMetadata(video.duration);
    if (onLoaded) onLoaded();
  };

  const handleLoadStart = () => {
    if (onLoadStart) onLoadStart();
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime + seconds;
      handleSeek(Math.max(0, Math.min(newTime, duration)));
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
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      setVolume(newMuted ? 0 : 1);
    }
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    if (!document.fullscreenElement) {
      await videoContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={videoContainerRef} className='relative w-full h-full bg-black'>
      <video
        ref={videoRef}
        src={src || url}
        poster={thumbnailUrl}
        className='w-full h-full object-contain'
        onLoadedMetadata={handleLoadedMetadata}
        onLoadStart={handleLoadStart}
        autoPlay={autoPlay}
        preload='metadata'
      />

      <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 hover:opacity-100'>
        <div className='w-full mb-4'>
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={value => handleSeek(value[0])}
            className='cursor-pointer'
          />
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Button
              variant='ghost'
              size='icon'
              onClick={togglePlay}
              className='text-white hover:bg-white/20'
            >
              {isPlaying ? <Pause className='h-6 w-6' /> : <Play className='h-6 w-6' />}
            </Button>

            <Button
              variant='ghost'
              size='icon'
              onClick={() => handleSkip(-10)}
              className='text-white hover:bg-white/20'
            >
              <SkipBack className='h-5 w-5' />
            </Button>

            <Button
              variant='ghost'
              size='icon'
              onClick={() => handleSkip(10)}
              className='text-white hover:bg-white/20'
            >
              <SkipForward className='h-5 w-5' />
            </Button>

            <span className='text-white text-sm ml-2'>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <Button
                variant='ghost'
                size='icon'
                onClick={toggleMute}
                className='text-white hover:bg-white/20'
              >
                {isMuted ? <VolumeX className='h-6 w-6' /> : <Volume2 className='h-6 w-6' />}
              </Button>
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                className='w-24'
                onValueChange={value => handleVolumeChange(value[0])}
              />
            </div>

            <Button
              variant='ghost'
              size='icon'
              onClick={toggleFullscreen}
              className='text-white hover:bg-white/20'
            >
              {isFullscreen ? <Minimize className='h-5 w-5' /> : <Maximize className='h-5 w-5' />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVideoPlayer;
