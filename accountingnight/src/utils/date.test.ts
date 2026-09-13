import { describe, expect, it } from 'vitest';
import { getCountdownParts, getEventPhase } from './date';

const start = new Date('2026-11-13T17:30:00+09:00');
const end = new Date('2026-11-13T21:00:00+09:00');

describe('date utilities', () => {
  it('calculates countdown before the event', () => {
    const parts = getCountdownParts(new Date('2026-11-12T17:30:00+09:00'), start, end);
    expect(parts.phase).toBe('before');
    expect(parts.days).toBe(1);
    expect(parts.hours).toBe(0);
  });

  it('detects started and ended states', () => {
    expect(getEventPhase(new Date('2026-11-13T18:00:00+09:00'), start, end)).toBe('started');
    expect(getEventPhase(new Date('2026-11-13T21:01:00+09:00'), start, end)).toBe('ended');
  });
});
