export interface HistoryItem {
  year: string;
  title: string;
  description: string[];
  featured?: boolean;
}

export const historyItems: HistoryItem[] = [
  {
    year: '1976',
    title: '국내 최초로 회계학과 설립',
    description: [],
    featured: true,
  },
  {
    year: '1979',
    title: '대학원 석사과정 개설',
    description: [],
  },
  {
    year: '1981',
    title: '공인회계사반 설립',
    description: [
      '공인회계사 시험을 준비하는 학생들에게 체계적인 지도와 지원',
      '매학기 공인회계사 준비생을 선발하여 장학금 지급, 특강 실시, 모의고사·개인지도 실시',
    ],
    featured: true,
  },
  {
    year: '1984',
    title: '회계연구소 설립',
    description: [
      '학부, 대학원, 연구소, 공인회계사반 등 훌륭한 인재배출을 위한 회계학 교육과 한국 회계학 발전에 기여할 수 있는 체제를 갖추게 됨',
      '대학원 박사과정 개설',
    ],
    featured: true,
  },
  {
    year: '1986',
    title: '신규교수 채용과정상의 ‘공개강의제’ 도입',
    description: ['공개적이고 합리적인 절차에 따라 교수 채용'],
  },
  {
    year: '1996',
    title: '회계학부 분리 개편',
    description: ['회계학부 주·야로 분리 개편'],
  },
  {
    year: '1997',
    title: '학부제 실시에 따라 회계학부로 독립',
    description: ['회계학전공과 세무회계학전공으로 분리'],
  },
  {
    year: '2000',
    title: '대학단위별 모집',
    description: [
      '신입생 모집단위를 경영대학으로 바꾸고 전공선택의 기회를 넓힘',
      '공통기초과목 수강 후 자신의 적성에 맞는 전공 선택',
    ],
  },
  {
    year: '2005',
    title: '야간모집단위를 주간모집단위로 전환',
    description: [
      '회계학전공(야)30, 세무회계학전공(야)30',
      '모집단위 내 전공을 통합',
      '경영학부(회계학60, 세무회계학60) → 경영학부(회계학120)',
    ],
  },
  {
    year: '2013',
    title: '회계학전공 폐지',
    description: ['경영학부 회계학전공 2학년 전공분리 폐지', '경영대학 경영학부 단일체제'],
  },
  {
    year: '2017',
    title: '회계학과 독립',
    description: [
      '회계학과 1학년 모집단위 독립',
      '경영대학 3학과 체제 (경영학과, 회계학과, 경영정보학과)',
    ],
    featured: true,
  },
];
