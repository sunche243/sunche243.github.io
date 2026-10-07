import type { StudentAttendanceDraft } from '../types/studentAttendance';
import { isValidMobilePhone } from './registration';

export interface StudentAttendanceValidationInput {
  draft: StudentAttendanceDraft;
  honeypot: string;
  formStartedAt: number;
  now?: number;
}

export interface StudentAttendanceValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateStudentAttendanceResponse({
  draft,
  honeypot,
  formStartedAt,
  now = Date.now(),
}: StudentAttendanceValidationInput): StudentAttendanceValidationResult {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();
  const phone = draft.phone.trim();
  const admissionYear = draft.admissionYear.trim();
  const studentCouncilDetails = draft.studentCouncilDetails.trim();

  if (!name || name.length > 80) errors.name = '이름을 80자 이내로 입력해주세요.';
  if (!isValidMobilePhone(phone)) {
    errors.phone = '01012345678 또는 010-1234-5678 형식으로 입력해주세요.';
  }
  if (admissionYear && !/^\d{2}$/.test(admissionYear)) {
    errors.admissionYear = '학번은 숫자 2자리로 입력해주세요. (예: 24)';
  }
  if (draft.studentCouncilExperience === null) {
    errors.studentCouncilExperience = '학생회 활동 여부를 선택해주세요.';
  }
  if (draft.studentCouncilExperience && !studentCouncilDetails) {
    errors.studentCouncilDetails = '활동 연도와 직책을 입력해주세요.';
  } else if (studentCouncilDetails.length > 500) {
    errors.studentCouncilDetails = '학생회 활동 내용을 500자 이내로 입력해주세요.';
  }
  if (draft.attendanceStatus !== 'attending' && draft.attendanceStatus !== 'not_attending') {
    errors.attendanceStatus = '참석 여부를 선택해주세요.';
  }
  if (!draft.privacyConsent) errors.privacy = '개인정보 수집 및 이용 동의가 필요합니다.';
  if (!draft.selectionCriteriaConsent) {
    errors.selectionCriteriaConsent = '참석자 선정 기준 동의가 필요합니다.';
  }
  if (honeypot.trim()) errors.form = '요청을 처리할 수 없습니다.';
  if (now - formStartedAt < 2_000) errors.form = '잠시 후 다시 제출해주세요.';

  return { valid: Object.keys(errors).length === 0, errors };
}
