export type ContentStatus = 'draft' | 'final';

export const event = {
  status: 'draft' as ContentStatus,
  title: '회계학과 50주년 기념 회계인의 밤',
  host: '동국대학교 회계학과',
  audience: '동문 · 교수 · 재학생',
  dateLabel: '2026년 11월 13일 금요일',
  shortDateLabel: '2026. 11. 13 FRI',
  startTime: '17:30',
  endTime: '21:00',
  timezone: 'Asia/Seoul',
  startIso: '2026-11-13T17:30:00+09:00',
  endIso: '2026-11-13T21:00:00+09:00',
  venue: '서울신라호텔 영빈관',
  venueEnglish: 'THE SHILLA SEOUL · YEONG BIN GWAN',
  address: '서울특별시 중구 동호로 249',
  englishLines: ['DONGGUK UNIVERSITY', 'DEPARTMENT OF ACCOUNTING'],
  anniversary: '50th ANNIVERSARY',
  years: '1976 — 2026',
  description: '동국대학교 회계학과 50주년 기념 회계인의 밤',
  siteUrl: 'https://sunche243.github.io/accountantsnight/',
  heroImage: `${import.meta.env.BASE_URL}images/hero.webp`,
  ogImage: `${import.meta.env.BASE_URL}images/og-image.jpg`,
};

export const invitationCopy = [
  '1976년 시작된 동국대학교 회계학과가\n어느덧 뜻깊은 50주년을 맞이하였습니다.',
  '지난 반세기 동안 회계학과의 역사를 함께 만들어주신\n동문 여러분과 교수님, 그리고 재학생 여러분을 모시고\n지나온 시간을 돌아보며 새로운 50년의 시작을 함께하고자 합니다.',
  '소중한 인연과 추억이 다시 이어지는\n동국대학교 회계학과 50주년 기념\n「회계인의 밤」에 여러분을 정중히 초대합니다.',
];

export const sponsorship = {
  status: 'draft' as ContentStatus,
  url: 'https://test.com',
  embedUrl: '',
};
