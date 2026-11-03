import { isValidMobilePhone, normalizePhone } from '../utils/registration';
import type {
  AdminManualResponseDraft,
  AdminManualResponseErrors,
  AdminManualResponseInput,
} from './adminDataTypes';

export interface AdminManualResponseValidationResult {
  valid: boolean;
  errors: AdminManualResponseErrors;
  value?: AdminManualResponseInput;
}

function optionalTrimmed(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizeAdminPledgeAmount(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits ? Number(digits).toLocaleString('ko-KR') : '';
}

export function validateAdminManualResponse(
  draft: AdminManualResponseDraft,
): AdminManualResponseValidationResult {
  const errors: AdminManualResponseErrors = {};
  const name = optionalTrimmed(draft.name);
  const phone = optionalTrimmed(draft.phone);
  const admissionYear = optionalTrimmed(draft.admissionYear);
  const affiliation = optionalTrimmed(draft.affiliation);
  const studentCouncilDetails = optionalTrimmed(draft.studentCouncilDetails);
  const adminMemo = optionalTrimmed(draft.adminMemo);
  const amountDigits = draft.pledgeAmount.replace(/,/g, '').trim();
  const pledgeAmount = amountDigits ? Number(amountDigits) : null;

  if (name && name.length > 80) errors.name = '성명은 80자 이내로 입력해주세요.';
  if (phone && !isValidMobilePhone(phone)) {
    errors.phone = '전화번호는 01012345678 또는 010-1234-5678 형식으로 입력해주세요.';
  }
  if (admissionYear && !/^\d{2}$/.test(admissionYear)) {
    errors.admissionYear = '입학년도(학번)는 숫자 2자리로 입력해주세요.';
  }
  if (affiliation && affiliation.length > 200) {
    errors.affiliation = '현재 소속 및 직함은 200자 이내로 입력해주세요.';
  }
  if (pledgeAmount !== null && (!Number.isSafeInteger(pledgeAmount) || pledgeAmount < 0 || pledgeAmount > 10_000_000_000)) {
    errors.pledgeAmount = '후원금액은 0원 이상 100억원 이하로 입력해주세요.';
  }
  if (studentCouncilDetails && studentCouncilDetails.length > 500) {
    errors.studentCouncilDetails = '학생회 활동 내용은 500자 이내로 입력해주세요.';
  }
  if (adminMemo && adminMemo.length > 2_000) {
    errors.adminMemo = '관리자 메모는 2,000자 이내로 입력해주세요.';
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors,
    value: {
      responseType: draft.responseType,
      name,
      phone: phone ? normalizePhone(phone) : null,
      admissionYear,
      affiliation,
      pledgeAmount,
      attendanceStatus: draft.attendanceStatus || null,
      studentCouncilExperience: draft.studentCouncilExperience === ''
        ? null
        : draft.studentCouncilExperience === 'yes',
      studentCouncilDetails,
      studentCouncilFeeStatus: draft.studentCouncilFeeStatus || null,
      adminMemo,
    },
  };
}
