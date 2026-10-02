import { describe, expect, it } from 'vitest';
import type { StoredSlide } from '../types';
import { formatDuration, getEstimatedDuration, getSlideDuration } from './playback';

const makeSlide = (overrides: Partial<StoredSlide> = {}): StoredSlide => ({
  id: 'slide',
  projectId: 'project',
  name: 'slide',
  blob: new Blob(),
  sourceType: 'image',
  duration: null,
  transition: null,
  transitionDuration: null,
  position: 0,
  createdAt: 0,
  ...overrides,
});

describe('playback timing', () => {
  it('uses a video duration unless a custom duration is set', () => {
    const video = makeSlide({ sourceType: 'video', mediaDuration: 12.4 });
    expect(getSlideDuration(video, { defaultDuration: 6 })).toBe(12.4);
    expect(getSlideDuration({ ...video, duration: 3 }, { defaultDuration: 6 })).toBe(3);
  });

  it('adds image and video durations', () => {
    expect(
      getEstimatedDuration(
        [makeSlide(), makeSlide({ sourceType: 'video', mediaDuration: 9 })],
        { defaultDuration: 6 },
      ),
    ).toBe(15);
  });

  it('formats short and long durations', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
