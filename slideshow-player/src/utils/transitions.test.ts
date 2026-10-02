import { describe, expect, it } from 'vitest';
import type { StoredSlide } from '../types';
import {
  createTransitionSequence,
  pickRandomTransition,
  RANDOM_MIX_TRANSITIONS,
} from './transitions';

const makeSlide = (
  id: string,
  transition: StoredSlide['transition'] = null,
): StoredSlide => ({
  id,
  projectId: 'project',
  name: id,
  blob: new Blob(),
  sourceType: 'image',
  duration: null,
  transition,
  transitionDuration: null,
  position: 0,
  createdAt: 0,
});

describe('random transition mix', () => {
  it('never chooses the immediately previous effect', () => {
    for (const previous of RANDOM_MIX_TRANSITIONS) {
      expect(pickRandomTransition(previous, () => 0)).not.toBe(previous);
    }
  });

  it('mixes only real effects and avoids consecutive duplicates', () => {
    const slides = Array.from({ length: 12 }, (_, index) => makeSlide(String(index)));
    const values = [0, 0.24, 0.49, 0.74, 0.99];
    let valueIndex = 0;
    const sequence = createTransitionSequence(
      slides,
      'random-mix',
      () => values[valueIndex++ % values.length],
    );

    expect(sequence).not.toContain('none');
    expect(sequence.every((transition) => RANDOM_MIX_TRANSITIONS.includes(transition))).toBe(true);
    expect(sequence.every((transition, index) => index === 0 || transition !== sequence[index - 1])).toBe(true);
  });

  it('keeps a slide-specific effect while mixing the others', () => {
    const sequence = createTransitionSequence(
      [makeSlide('one'), makeSlide('two', 'none'), makeSlide('three')],
      'random-mix',
      () => 0,
    );

    expect(sequence[1]).toBe('none');
    expect(sequence[0]).toBe('crossfade');
    expect(sequence[2]).toBe('crossfade');
  });
});
