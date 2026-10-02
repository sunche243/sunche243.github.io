import type { PlayerSettings, StoredSlide } from '../types';

export function getSlideDuration(
  slide: StoredSlide,
  settings: Pick<PlayerSettings, 'defaultDuration'>,
): number {
  if (slide.duration !== null) return slide.duration;
  if (slide.sourceType === 'video' && slide.mediaDuration) {
    return Math.max(1, slide.mediaDuration);
  }
  return settings.defaultDuration;
}

export function getEstimatedDuration(
  slides: readonly StoredSlide[],
  settings: Pick<PlayerSettings, 'defaultDuration'>,
): number {
  return slides.reduce(
    (total, slide) => total + getSlideDuration(slide, settings),
    0,
  );
}

export function formatDuration(totalSeconds: number): string {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
