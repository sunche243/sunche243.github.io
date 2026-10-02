import { describe, expect, it } from 'vitest';
import { formatFileSize, isSupportedAudioFile } from './audio';

describe('isSupportedAudioFile', () => {
  it('accepts the supported audio formats by MIME type or extension', () => {
    expect(isSupportedAudioFile({ name: 'music.bin', type: 'audio/mpeg' })).toBe(true);
    expect(isSupportedAudioFile({ name: 'music.M4A', type: '' })).toBe(true);
    expect(isSupportedAudioFile({ name: 'music.wav', type: 'audio/wav' })).toBe(true);
  });

  it('rejects unrelated file formats', () => {
    expect(isSupportedAudioFile({ name: 'video.mp4', type: 'video/mp4' })).toBe(false);
    expect(isSupportedAudioFile({ name: 'notes.pdf', type: 'application/pdf' })).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formats kilobytes and megabytes for the settings summary', () => {
    expect(formatFileSize(800)).toBe('1 KB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});
