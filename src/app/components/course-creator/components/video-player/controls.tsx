import React from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/ui/slider';

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

interface VideoControlsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onVolumeChange: (value: number) => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  volume,
  isMuted,
  currentTime,
  duration,
  onPlayPause,
  onVolumeChange,
}) => {
  const volumePercent = Math.round(volume * 100);
  
  return (
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          className="text-white hover:bg-white/20"
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        <span className="text-white text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onVolumeChange(isMuted ? volume || 1 : 0)}
          className="text-white hover:bg-white/20"
          title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
        >
          {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
        <div className="relative flex items-center w-24">
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            max={100}
            step={1}
            onValueChange={([value]) => onVolumeChange(value / 100)}
            className="w-full"
            aria-label="التحكم في مستوى الصوت"
            title={`مستوى الصوت: ${volumePercent}%`}
          />
        </div>
      </div>
    </div>
  );
}; 