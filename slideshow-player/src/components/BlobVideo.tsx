import { useEffect, useRef } from 'react';
import { useBlobUrl } from '../hooks/useBlobUrl';

interface BlobVideoProps {
  blob: Blob;
  className?: string;
  style?: React.CSSProperties;
  playing?: boolean;
  muted?: boolean;
  volume?: number;
  onEnded?: () => void;
  onLoadedData?: () => void;
  onError?: () => void;
}

export function BlobVideo({
  blob,
  className,
  style,
  playing = false,
  muted = true,
  volume = 1,
  onEnded,
  onLoadedData,
  onError,
}: BlobVideoProps) {
  const url = useBlobUrl(blob);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) video.play().catch(() => undefined);
    else video.pause();
  }, [playing, url]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.min(1, Math.max(0, volume));
    }
  }, [volume]);

  return (
    <video
      ref={videoRef}
      src={url}
      className={className}
      style={style}
      muted={muted}
      playsInline
      preload="metadata"
      onEnded={onEnded}
      onLoadedData={onLoadedData}
      onError={onError}
    />
  );
}
