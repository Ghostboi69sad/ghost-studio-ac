import React, { useState } from 'react';
import { getMediaUrl } from '../lib/aws/cloudfront-config';

interface VideoPlayerProps {
  url: string;
  thumbnailUrl?: string;
  onLoadStart?: () => void;
  onLoaded?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, thumbnailUrl, onLoadStart, onLoaded }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadStart = () => {
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoaded = () => {
    setIsLoading(false);
    onLoaded?.();
  };

  return (
    <div className='relative'>
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-900/50'>
          <div className='loading-spinner' />
        </div>
      )}
      <video
        className='w-full rounded-lg shadow-lg'
        controls
        preload='metadata'
        poster={thumbnailUrl}
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoaded}
      >
        <source src={getMediaUrl(url)} type='video/mp4' />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
