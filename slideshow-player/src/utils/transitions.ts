import type { StoredSlide, TransitionType } from '../types';

export type ResolvedTransitionType = Exclude<TransitionType, 'random-mix'>;

export const RANDOM_MIX_TRANSITIONS: readonly ResolvedTransitionType[] = [
  'crossfade',
  'fade-black',
  'fade-white',
  'slide-left',
  'zoom',
];

export function pickRandomTransition(
  previous: ResolvedTransitionType | null,
  random: () => number = Math.random,
): ResolvedTransitionType {
  const candidates = previous
    ? RANDOM_MIX_TRANSITIONS.filter((transition) => transition !== previous)
    : RANDOM_MIX_TRANSITIONS;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index];
}

export function createTransitionSequence(
  slides: readonly StoredSlide[],
  defaultTransition: TransitionType,
  random: () => number = Math.random,
): ResolvedTransitionType[] {
  let previous: ResolvedTransitionType | null = null;

  return slides.map((slide) => {
    const requested = slide.transition ?? defaultTransition;
    const resolved = requested === 'random-mix'
      ? pickRandomTransition(previous, random)
      : requested;
    previous = resolved;
    return resolved;
  });
}
