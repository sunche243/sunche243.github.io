import { MAX_SPONSOR_UNITS, MIN_SPONSOR_UNITS, SPONSOR_UNIT_AMOUNT } from '../config/sponsorship';
import type {
  AttendanceStatus,
  DynamicAnswers,
  DynamicAnswerValue,
  FormField,
  RegistrationDraft,
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

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith('+') ? '+' : '';
  return `${prefix}${trimmed.replace(/\D/g, '')}`;
}

export function normalizeSponsorshipUnits(value: number): number {
  if (!Number.isFinite(value)) return MIN_SPONSOR_UNITS;
  return Math.min(MAX_SPONSOR_UNITS, Math.max(MIN_SPONSOR_UNITS, Math.trunc(value)));
}

export function calculateSponsorshipAmount(units: number): number {
  return normalizeSponsorshipUnits(units) * SPONSOR_UNIT_AMOUNT;
}

export function formatWon(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
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
  const phone = normalizePhone(draft.phone);

  if (!name || name.length > 80) errors.name = '이름을 80자 이내로 입력해주세요.';
  if (!/^\+?\d{7,20}$/.test(phone)) errors.phone = '연락 가능한 전화번호를 입력해주세요.';
  if (!draft.wantsSponsorship && !draft.attendanceStatus) {
    errors.participation = '후원 의향 또는 참석 여부 중 하나를 선택해주세요.';
  }
  if (
    draft.wantsSponsorship &&
    (!Number.isInteger(draft.sponsorshipUnits) ||
      draft.sponsorshipUnits < MIN_SPONSOR_UNITS ||
      draft.sponsorshipUnits > MAX_SPONSOR_UNITS)
  ) {
    errors.sponsorshipUnits = `후원 구좌는 ${MIN_SPONSOR_UNITS}에서 ${MAX_SPONSOR_UNITS} 사이로 선택해주세요.`;
  }
  if (!draft.privacyConsent) errors.privacy = '개인정보 수집 및 이용 동의가 필요합니다.';

  for (const field of fields) {
    const value = answers[field.id];
    if (field.required && isAnswerEmpty(value)) {
      errors[field.id] = `${field.label} 항목을 입력해주세요.`;
      continue;
    }
    if (isAnswerEmpty(value)) continue;

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
