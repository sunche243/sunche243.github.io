import { useBlobUrl } from '../hooks/useBlobUrl';

interface BlobImageProps {
  blob: Blob;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

export function BlobImage({
  blob,
  alt,
  className,
  style,
  onLoad,
  onError,
}: BlobImageProps) {
  const url = useBlobUrl(blob);

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
