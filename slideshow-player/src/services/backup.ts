import {
  DEFAULT_SETTINGS,
  type PlayerSettings,
  type SlideshowProject,
  type StoredAudioTrack,
  type StoredSlide,
} from '../types';

const BACKUP_FORMAT = 'frameflow-backup';
const BACKUP_VERSION = 1;

interface EncodedBlob {
  type: string;
  base64: string;
}

interface BackupDocument {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  project: Pick<SlideshowProject, 'name'>;
  settings: PlayerSettings;
  slides: Array<Omit<StoredSlide, 'blob'> & { blob: EncodedBlob }>;
  audioTracks: Array<Omit<StoredAudioTrack, 'blob'> & { blob: EncodedBlob }>;
}

export interface RestoredBackup {
  name: string;
  settings: PlayerSettings;
  slides: StoredSlide[];
  audioTracks: StoredAudioTrack[];
  totalBytes: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function encodeBlob(blob: Blob): Promise<EncodedBlob> {
  return {
    type: blob.type,
    base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
  };
}

function decodeBlob(encoded: EncodedBlob): Blob {
  if (!encoded || typeof encoded.base64 !== 'string' || typeof encoded.type !== 'string') {
    throw new Error('백업 안의 미디어 정보가 올바르지 않습니다.');
  }
  const bytes = base64ToBytes(encoded.base64);
  return new Blob([bytes.buffer as ArrayBuffer], { type: encoded.type });
}

export async function createProjectBackup(
  project: SlideshowProject,
  slides: readonly StoredSlide[],
  audioTracks: readonly StoredAudioTrack[],
  settings: PlayerSettings,
): Promise<Blob> {
  const document: BackupDocument = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project: { name: project.name },
    settings,
    slides: await Promise.all(
      slides.map(async ({ blob, ...slide }) => ({ ...slide, blob: await encodeBlob(blob) })),
    ),
    audioTracks: await Promise.all(
      audioTracks.map(async ({ blob, ...track }) => ({ ...track, blob: await encodeBlob(blob) })),
    ),
  };

  return new Blob([JSON.stringify(document)], {
    type: 'application/x-frameflow+json',
  });
}

export async function parseProjectBackup(file: Blob): Promise<RestoredBackup> {
  let parsed: BackupDocument;
  try {
    parsed = JSON.parse(await file.text()) as BackupDocument;
  } catch {
    throw new Error('Frameflow 백업 파일을 읽을 수 없습니다.');
  }

  if (
    parsed?.format !== BACKUP_FORMAT ||
    parsed.version !== BACKUP_VERSION ||
    !parsed.project?.name ||
    !Array.isArray(parsed.slides) ||
    !Array.isArray(parsed.audioTracks)
  ) {
    throw new Error('지원하지 않거나 손상된 Frameflow 백업입니다.');
  }

  const slides = parsed.slides.map(({ blob, ...slide }) => ({
    ...slide,
    blob: decodeBlob(blob),
  }));
  const audioTracks = parsed.audioTracks.map(({ blob, ...track }) => ({
    ...track,
    blob: decodeBlob(blob),
  }));

  return {
    name: parsed.project.name,
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    slides,
    audioTracks,
    totalBytes:
      slides.reduce((total, slide) => total + slide.blob.size, 0) +
      audioTracks.reduce((total, track) => total + track.blob.size, 0),
  };
}

export function makeBackupFileName(projectName: string): string {
  const safeName = projectName.replace(/[\\/:*?"<>|]/g, '-').trim() || 'slideshow';
  const date = new Date().toISOString().slice(0, 10);
  return `${safeName}-${date}.frameflow`;
}
