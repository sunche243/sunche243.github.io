import type { AttendanceStatus, PledgeOption } from '../types/registration';

export const SPONSOR_UNIT_AMOUNT = 500_000;
export const MIN_CUSTOM_PLEDGE_AMOUNT = 1_000_000;
export const MAX_PLEDGE_AMOUNT = 10_000_000_000;
export const CUSTOM_PLEDGE_MINIMUM_NOTICE = '자유 후원은 100만 원 이상부터 가능합니다.';

export interface PledgeOptionDetail {
  optionNumber: number;
  label: string;
  title: string;
  amount: number | null;
  attendanceStatus: Exclude<AttendanceStatus, 'undecided'>;
}

export const pledgeOptionDetails: Record<PledgeOption, PledgeOptionDetail> = {
  century_100: {
    optionNumber: 1,
    label: '100주년 발전 구좌',
    title: '100만 원 후원 + 행사 참석',
    amount: 1_000_000,
    attendanceStatus: 'attending',
  },
  guardian_50: {
    optionNumber: 2,
    label: '50주년 수호 구좌',
    title: '50만 원 후원 + 행사 참석',
    amount: 500_000,
    attendanceStatus: 'attending',
  },
  free_attending: {
    optionNumber: 3,
    label: '마음으로 함께하기',
    title: '자유 금액 후원 + 행사 참석',
    amount: null,
    attendanceStatus: 'attending',
  },
  free_absent: {
    optionNumber: 4,
    label: '불참 · 발전기금 약정',
    title: '행사에는 아쉽게 불참하나,\n[50주년 발전기금]으로 마음을 전합니다.',
    amount: null,
    attendanceStatus: 'not_attending',
  },
  absent_only: {
    optionNumber: 5,
    label: '불참',
    title: '이번 행사에는 참석하지 못하며,\n다음 기회에 함께하겠습니다.',
    amount: 0,
    attendanceStatus: 'not_attending',
  },
};

export const pledgeOptions = Object.keys(pledgeOptionDetails) as PledgeOption[];
