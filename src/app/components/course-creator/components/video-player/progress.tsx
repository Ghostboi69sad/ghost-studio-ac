import React from 'react';
import { Slider } from '../ui/ui/slider';

interface VideoProgressProps {
  currentTime: number;
  duration: number;
  buffered: TimeRanges | null;
  onSeek: (value: number) => void;
}

export const VideoProgress: React.FC<VideoProgressProps> = ({
  currentTime,
  duration,
  buffered,
  onSeek,
}) => {
  const progress = (currentTime / duration) * 100;
  const bufferedProgress = buffered?.length
    ? (buffered.end(buffered.length - 1) / duration) * 100
    : 0;

  return (
    <div className='relative w-full h-1 group'>
      {/* Buffer Progress */}
      <div className='absolute h-full bg-white/30' style={{ width: `${bufferedProgress}%` }} />

      {/* Playback Progress */}
      <Slider
        value={[currentTime]}
        max={duration}
        step={1}
        onValueChange={([value]) => onSeek(value)}
        className='absolute inset-0'
      />
    </div>
  );
};
