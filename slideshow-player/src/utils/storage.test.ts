import { describe, expect, it } from 'vitest';
import { getStorageLevel, hasRoomForFiles } from './storage';

describe('storage warnings', () => {
  it('warns and blocks before the browser quota is exhausted', () => {
    const info = { usage: 960, quota: 1000, persistent: false };
    expect(getStorageLevel(info)).toBe('critical');
    expect(hasRoomForFiles(info, 1)).toBe(false);
  });

  it('allows uploads when the browser does not report a quota', () => {
    expect(
      hasRoomForFiles({ usage: null, quota: null, persistent: null }, 1000),
    ).toBe(true);
  });
});
