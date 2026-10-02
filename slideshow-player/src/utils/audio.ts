const SUPPORTED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
]);

const SUPPORTED_EXTENSION = /\.(mp3|m4a|wav)$/i;

export function isSupportedAudioFile(
  file: Pick<File, 'name' | 'type'>,
): boolean {
  return SUPPORTED_MIME_TYPES.has(file.type) || SUPPORTED_EXTENSION.test(file.name);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
