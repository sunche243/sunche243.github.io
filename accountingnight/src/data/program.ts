export interface ProgramItem {
  time: string;
  title: string;
  description?: string;
}

// 행사 식순은 이 배열만 수정하면 됩니다.
// 새 식순 추가: { time: '18:00', title: '행사명' }
// 상세 설명이 필요하면 description을 추가합니다.
export const programItems: ProgramItem[] = [
  {
    time: '17:00',
    title: '입장 시작',
  },
  {
    time: '17:30',
    title: '개회',
  },
  {
    time: '18:00',
    title: '환영사',
  },
  {
    time: '18:30',
    title: '축사',
  },
  {
    time: '19:00-19:55',
    title: '식사',
  },
  {
    time: '19:55-20:20',
    title: 'ACCORD 공연',
  },
  {
    time: '20:20',
    title: '2부 시작 및 레크레이션',
  },
  {
    time: '20:40',
    title: '럭키드로우',
  },
  {
    time: '21:00',
    title: '폐회식',
  },
];
