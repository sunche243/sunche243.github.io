import type { TransitionType } from '../types';

export const TRANSITIONS: Array<{ value: TransitionType; label: string }> = [
  { value: 'random-mix', label: '랜덤 믹스 · 매 장면 다른 효과' },
  { value: 'crossfade', label: '부드러운 교차 페이드' },
  { value: 'fade-black', label: '검정으로 페이드' },
  { value: 'fade-white', label: '흰색으로 페이드' },
  { value: 'slide-left', label: '옆으로 슬라이드' },
  { value: 'zoom', label: '천천히 확대' },
  { value: 'none', label: '전환 효과 없음' },
];
