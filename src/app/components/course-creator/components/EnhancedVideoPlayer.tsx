'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "./ui/button"
import { Slider } from "./ui/ui/slider"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'

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
  onLoadedMetadata
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => {
      setCurrentTime(video.currentTime)
      if (onProgress) {
        onProgress((video.currentTime / video.duration) * 100)
      }
    }
    
    video.addEventListener('timeupdate', updateTime)
    return () => video.removeEventListener('timeupdate', updateTime)
  }, [onProgress])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.play()
    } else {
      video.pause()
    }
  }, [isPlaying])

  const togglePlay = () => setIsPlaying(!isPlaying)

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
    if (onLoadedMetadata) onLoadedMetadata(video.duration)
    if (onLoaded) onLoaded()
  }

  const handleLoadStart = () => {
    if (onLoadStart) onLoadStart()
  }

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      const newTime = videoRef.current.currentTime + seconds
      handleSeek(Math.max(0, Math.min(newTime, duration)))
    }
  }

  const handleVolumeChange = (value: number) => {
    if (videoRef.current) {
      videoRef.current.volume = value
      setVolume(value)
      setIsMuted(value === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted
      videoRef.current.muted = newMuted
      setIsMuted(newMuted)
      setVolume(newMuted ? 0 : 1)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <video
          ref={videoRef}
          src={src || url}
          poster={thumbnailUrl}
          className="w-full rounded-lg shadow-lg"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadStart={handleLoadStart}
          autoPlay={autoPlay}
          preload="metadata"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <div className="flex-1 mx-4">
              <Slider
                value={[currentTime]}
                max={duration}
                step={0.1}
                onValueChange={(value) => handleSeek(value[0])}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                className="w-24"
                onValueChange={(value) => handleVolumeChange(value[0])}
              />
            </div>
            <span className="text-sm ml-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex justify-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => handleSkip(-10)}>
              <SkipBack className="h-4 w-4 mr-2" />
              10s
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleSkip(10)}>
              10s
              <SkipForward className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnhancedVideoPlayer