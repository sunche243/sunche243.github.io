import type { AttendanceDraft, AttendanceResponseStatus } from '../types/attendance';
import { isValidMobilePhone } from './registration';

export const attendanceResponseLabels: Record<AttendanceResponseStatus, string> = {
  attending: '참석',
  not_attending: '불참',
};

export interface AttendanceValidationInput {
  draft: AttendanceDraft;
  honeypot: string;
  formStartedAt: number;
  now?: number;
}

export interface AttendanceValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateAttendanceResponse({
  draft,
  honeypot,
  formStartedAt,
  now = Date.now(),
}: AttendanceValidationInput): AttendanceValidationResult {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const phone = draft.phone.trim();
  const admissionYear = draft.admissionYear.trim();
  const affiliation = draft.affiliation.trim();

  if (!name || name.length > 80) errors.name = '이름을 80자 이내로 입력해주세요.';
  if (!isValidMobilePhone(phone)) {
    errors.phone = '01012345678 또는 010-1234-5678 형식으로 입력해주세요.';
  }
  if (admissionYear && !/^\d{2}$/.test(admissionYear)) {
    errors.admissionYear = '학번은 숫자 2자리로 입력해주세요. (예: 98)';
  }
  if (affiliation.length > 200) {
    errors.affiliation = '현재 소속 및 직함을 200자 이내로 입력해주세요.';
  }
  if (draft.attendanceStatus !== 'attending' && draft.attendanceStatus !== 'not_attending') {
    errors.attendanceStatus = '참석 여부를 선택해주세요.';
  }
  if (!draft.privacyConsent) errors.privacy = '개인정보 수집 및 이용 동의가 필요합니다.';
  if (honeypot.trim()) errors.form = '요청을 처리할 수 없습니다.';
  if (now - formStartedAt < 2_000) errors.form = '잠시 후 다시 제출해주세요.';

  return { valid: Object.keys(errors).length === 0, errors };
}

export interface SuccessScrollTarget {
  scrollIntoView(options?: ScrollIntoViewOptions): void;
}

export interface SuccessFocusTarget {
  focus(options?: FocusOptions): void;
}

export type AttendanceSuccessFrameScheduler = (callback: FrameRequestCallback) => number;

export function moveToAttendanceSuccess(
  section: SuccessScrollTarget | null,
  heading: SuccessFocusTarget | null,
  reduceMotion: boolean,
): void {
  heading?.focus({ preventScroll: true });
  section?.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function scheduleAttendanceSuccessNavigation(
  scheduleFrame: AttendanceSuccessFrameScheduler,
  section: SuccessScrollTarget | null,
  heading: SuccessFocusTarget | null,
  reduceMotion: boolean,
): number {
  return scheduleFrame(() => {
    moveToAttendanceSuccess(section, heading, reduceMotion);
  });
}
