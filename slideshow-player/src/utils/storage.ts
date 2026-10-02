import type { StorageInfo } from '../types';

export type StorageLevel = 'ok' | 'warning' | 'critical' | 'unknown';

export function getStorageLevel(info: StorageInfo): StorageLevel {
  if (!info.quota || info.usage === null) return 'unknown';
  const remaining = info.quota - info.usage;
  const ratio = info.usage / info.quota;

  if (ratio >= 0.95 || remaining < 100 * 1024 * 1024) return 'critical';
  if (ratio >= 0.8 || remaining < 300 * 1024 * 1024) return 'warning';
  return 'ok';
}

export function hasRoomForFiles(
  info: StorageInfo,
  incomingBytes: number,
): boolean {
  if (!info.quota || info.usage === null) return true;
  return info.usage + incomingBytes < info.quota * 0.95;
}
