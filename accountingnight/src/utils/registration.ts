import {
  MAX_PLEDGE_AMOUNT,
  pledgeOptionDetails,
  SPONSOR_UNIT_AMOUNT,
} from '../config/sponsorship';
import type {
  AttendanceStatus,
  DynamicAnswers,
  DynamicAnswerValue,
  FormField,
  PledgeOption,
  RegistrationDraft,
  StoredPledgeOption,
  Submission,
  SubmissionStatus,
} from '../types/registration';

export const attendanceLabels: Record<AttendanceStatus, string> = {
  attending: '참석 예정',
  not_attending: '불참 예정',
  undecided: '미정',
};

export const submissionStatusLabels: Record<SubmissionStatus, string> = {
  new: '신규',
  contacted: '연락 완료',
  confirmed: '확정',
  cancelled: '취소',
};

export const pledgeOptionLabels: Record<StoredPledgeOption, string> = {
  century_100: '100주년 발전 구좌',
  guardian_50: '50주년 수호 구좌',
  free_attending: '마음으로 함께하기',
  free_absent: '불참 · 발전기금 약정',
  absent_only: '불참',
  legacy_units: '기존 구좌 약정',
  legacy_no_pledge: '기존 무약정 응답',
};

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith('+') ? '+' : '';
  return `${prefix}${trimmed.replace(/\D/g, '')}`;
}

export function isValidMobilePhone(value: string): boolean {
  return /^(?:010\d{8}|010-\d{4}-\d{4})$/.test(value.trim());
}

export function calculateSponsorshipAmount(units: number): number {
  if (!Number.isFinite(units)) return 0;
  return Math.max(0, Math.trunc(units)) * SPONSOR_UNIT_AMOUNT;
}

export function formatWon(amount: number): string {
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(amount)}원`;
}

export function getPledgeSelection(option: PledgeOption, customAmount: number) {
  const detail = pledgeOptionDetails[option];
  return {
    amount: detail.amount ?? customAmount,
    attendanceStatus: detail.attendanceStatus,
  };
}

export function normalizePledgeAmountInput(value: string): number {
  const digits = value.replace(/\D/g, '').slice(0, 15);
  if (!digits) return 0;
  return Number(digits);
}

export function getSubmissionPledgeAmount(submission: Submission): number {
  if (Number.isFinite(submission.pledge_amount)) return Math.max(0, submission.pledge_amount);
  return calculateSponsorshipAmount(submission.sponsorship_units);
}

export function getPledgeOptionLabel(option: StoredPledgeOption | null): string {
  return option ? pledgeOptionLabels[option] : '기존 응답';
}

function normalizedFieldLabel(label: string): string {
  return label.toLocaleLowerCase('ko-KR').replace(/[\s()[\]·_\-/]/g, '');
}

export function isAdmissionFieldLabel(label: string): boolean {
  const normalized = normalizedFieldLabel(label);
  return ['입학년도학번', '학번입학년도', '입학년도', '학번'].includes(normalized);
}

export function isAffiliationFieldLabel(label: string): boolean {
  const normalized = normalizedFieldLabel(label);
  return [
    '현재소속및직함',
    '소속및직함',
    '현재소속직함',
    '소속직함',
    '현재소속및직책',
    '소속및직책',
    '현재소속',
    '소속',
  ].includes(normalized);
}

export function findSubmissionAnswerByLabel(
  submission: Submission,
  matcher: (label: string) => boolean,
): DynamicAnswerValue | undefined {
  return Object.values(submission.answers).find((answer) => matcher(answer.label))?.value;
}

export function isAnswerEmpty(value: DynamicAnswerValue | undefined): boolean {
  return value === undefined || value === false || (typeof value === 'string' && !value.trim());
}

export function serializeDynamicAnswers(fields: FormField[], answers: DynamicAnswers): DynamicAnswers {
  return fields.reduce<DynamicAnswers>((serialized, field) => {
    const value = answers[field.id];
    if (!isAnswerEmpty(value)) serialized[field.id] = typeof value === 'string' ? value.trim() : value;
    return serialized;
  }, {});
}

export interface RegistrationValidationInput {
  draft: RegistrationDraft;
  fields: FormField[];
  answers: DynamicAnswers;
  honeypot: string;
  formStartedAt: number;
  now?: number;
}

export interface RegistrationValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateRegistration({
  draft,
  fields,
  answers,
  honeypot,
  formStartedAt,
  now = Date.now(),
}: RegistrationValidationInput): RegistrationValidationResult {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const phone = draft.phone.trim();

  if (!name || name.length > 80) errors.name = '이름을 80자 이내로 입력해주세요.';
  if (!isValidMobilePhone(phone)) {
    errors.phone = '01012345678 또는 010-1234-5678 형식으로 입력해주세요.';
  }
  if (!draft.pledgeOption) {
    errors.pledgeOption = '참석 및 발전기금 약정 옵션을 선택해주세요.';
  } else {
    const detail = pledgeOptionDetails[draft.pledgeOption];
    if (detail.amount === null && (
      !Number.isSafeInteger(draft.pledgeAmount) ||
      draft.pledgeAmount <= 0 ||
      draft.pledgeAmount > MAX_PLEDGE_AMOUNT
    )) {
      errors.pledgeAmount = `약정액은 1원 이상 ${formatWon(MAX_PLEDGE_AMOUNT)} 이하로 입력해주세요.`;
    }
  }
  if (!draft.privacyConsent) errors.privacy = '개인정보 수집 및 이용 동의가 필요합니다.';

  for (const field of fields) {
    const value = answers[field.id];
    if (field.required && isAnswerEmpty(value)) {
      errors[field.id] = `${field.label} 항목을 입력해주세요.`;
      continue;
    }
    if (isAnswerEmpty(value)) continue;

    if (isAdmissionFieldLabel(field.label) && !/^\d{2}$/.test(String(value).trim())) {
      errors[field.id] = '학번은 숫자 2자리로 입력해주세요. (예: 98)';
      continue;
    }
    if (field.type === 'email' && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      errors[field.id] = '올바른 이메일 형식으로 입력해주세요.';
    }
    if (field.type === 'tel' && typeof value === 'string' && !/^\+?\d{7,20}$/.test(normalizePhone(value))) {
      errors[field.id] = '연락 가능한 전화번호를 입력해주세요.';
    }
    if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
      errors[field.id] = '숫자로 입력해주세요.';
    }
    if ((field.type === 'select' || field.type === 'radio') && !field.options.includes(String(value))) {
      errors[field.id] = '제공된 선택지 중 하나를 선택해주세요.';
    }
  }

  if (honeypot.trim()) errors.form = '요청을 처리할 수 없습니다.';
  if (now - formStartedAt < 2_000) errors.form = '잠시 후 다시 제출해주세요.';

  return { valid: Object.keys(errors).length === 0, errors };
}
