import { useEffect } from 'react';

interface CachedBlobUrl {
  url: string;
  references: number;
  revokeTimer: number | null;
}

const blobUrlCache = new WeakMap<Blob, CachedBlobUrl>();

function revokeLater(blob: Blob, entry: CachedBlobUrl, delay = 0) {
  if (entry.revokeTimer !== null) return;

  entry.revokeTimer = window.setTimeout(() => {
    entry.revokeTimer = null;
    if (entry.references === 0 && blobUrlCache.get(blob) === entry) {
      URL.revokeObjectURL(entry.url);
      blobUrlCache.delete(blob);
    }
  }, delay);
}

function getBlobUrl(blob: Blob): CachedBlobUrl {
  const cached = blobUrlCache.get(blob);
  if (cached) return cached;

  const created: CachedBlobUrl = {
    url: URL.createObjectURL(blob),
    references: 0,
    revokeTimer: null,
  };
  blobUrlCache.set(blob, created);

  // Concurrent rendering can prepare a component that is never mounted.
  // Release that provisional URL unless an effect retains it after commit.
  revokeLater(blob, created, 10_000);
  return created;
}

export function useBlobUrl(blob: Blob): string {
  const entry = getBlobUrl(blob);

  useEffect(() => {
    const retained = getBlobUrl(blob);
    if (retained.revokeTimer !== null) {
      window.clearTimeout(retained.revokeTimer);
      retained.revokeTimer = null;
    }
    retained.references += 1;

    return () => {
      retained.references = Math.max(0, retained.references - 1);
      if (retained.references === 0) revokeLater(blob, retained);
    };
  }, [blob]);

  return entry.url;
}
