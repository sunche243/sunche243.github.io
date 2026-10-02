import type {
  AttendanceResponse,
  AttendanceResponseEditableFields,
  AttendanceResponseStatus,
} from '../types/attendance';
import { isValidMobilePhone, normalizePhone } from '../utils/registration';

export interface AttendanceAdminFilters {
  query: string;
  status: AttendanceResponseStatus | 'all';
}

export interface AttendanceAdminStats {
  total: number;
  attending: number;
  notAttending: number;
  attendanceRate: number;
}

export interface AttendanceAdminEditDraft {
  name: string;
  phone: string;
  admissionYear: string;
  affiliation: string;
  attendanceStatus: string;
}

export type AttendanceAdminEditErrors = Partial<Record<keyof AttendanceAdminEditDraft, string>>;

export interface AttendanceAdminEditValidationResult {
  valid: boolean;
  errors: AttendanceAdminEditErrors;
  value?: AttendanceResponseEditableFields;
}

export function validateAttendanceAdminEdit(
  draft: AttendanceAdminEditDraft,
): AttendanceAdminEditValidationResult {
  const errors: AttendanceAdminEditErrors = {};
  const name = draft.name.trim();
  const phone = draft.phone.trim();
  const admissionYear = draft.admissionYear.trim();
  const affiliation = draft.affiliation.trim();

  if (!name || name.length > 80) errors.name = '성명을 1~80자로 입력해주세요.';
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

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors,
    value: {
      name,
      phone: normalizePhone(phone),
      admission_year: admissionYear || null,
      affiliation: affiliation || null,
      attendance_status: draft.attendanceStatus as AttendanceResponseStatus,
    },
  };
}

export function updateAttendanceResponseInList(
  responses: AttendanceResponse[],
  id: string,
  value: AttendanceResponseEditableFields,
): AttendanceResponse[] {
  return responses.map((response) => response.id === id ? { ...response, ...value } : response);
}

export function deleteAttendanceResponseFromList(
  responses: AttendanceResponse[],
  id: string,
): AttendanceResponse[] {
  return responses.filter((response) => response.id !== id);
}

export function calculateAttendanceAdminStats(responses: AttendanceResponse[]): AttendanceAdminStats {
  const attending = responses.filter((response) => response.attendance_status === 'attending').length;
  const notAttending = responses.filter((response) => response.attendance_status === 'not_attending').length;

  return {
    total: responses.length,
    attending,
    notAttending,
    attendanceRate: responses.length ? (attending / responses.length) * 100 : 0,
  };
}

export function filterAttendanceResponses(
  responses: AttendanceResponse[],
  filters: AttendanceAdminFilters,
): AttendanceResponse[] {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');
  const normalizedPhoneQuery = normalizePhone(filters.query);

  return responses.filter((response) => {
    const matchesQuery = !query
      || response.name.toLocaleLowerCase('ko-KR').includes(query)
      || (normalizedPhoneQuery.length > 0 && response.phone.includes(normalizedPhoneQuery))
      || (response.admission_year?.toLocaleLowerCase('ko-KR').includes(query) ?? false)
      || (response.affiliation?.toLocaleLowerCase('ko-KR').includes(query) ?? false);
    const matchesStatus = filters.status === 'all' || response.attendance_status === filters.status;

    return matchesQuery && matchesStatus;
  });
}

export function countAttendanceResponsesByPhone(responses: AttendanceResponse[]): Map<string, number> {
  return responses.reduce((counts, response) => {
    counts.set(response.phone, (counts.get(response.phone) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}
