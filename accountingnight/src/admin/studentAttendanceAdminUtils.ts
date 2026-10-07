import type { AttendanceResponseStatus } from '../types/attendance';
import type {
  StudentAttendanceResponse,
  StudentAttendanceResponseEditableFields,
} from '../types/studentAttendance';
import { isValidMobilePhone, normalizePhone } from '../utils/registration';

export interface StudentAttendanceAdminFilters {
  query: string;
  status: AttendanceResponseStatus | 'all';
  studentCouncil: 'all' | 'yes' | 'no';
}

export interface StudentAttendanceAdminStats {
  total: number;
  attending: number;
  notAttending: number;
  studentCouncilExperienced: number;
}

export interface StudentAttendanceAdminEditDraft {
  name: string;
  phone: string;
  admissionYear: string;
  studentCouncilExperience: boolean;
  studentCouncilDetails: string;
  attendanceStatus: string;
}

export type StudentAttendanceAdminEditErrors = Partial<Record<keyof StudentAttendanceAdminEditDraft, string>>;

export interface StudentAttendanceAdminEditValidationResult {
  valid: boolean;
  errors: StudentAttendanceAdminEditErrors;
  value?: StudentAttendanceResponseEditableFields;
}

export function validateStudentAttendanceAdminEdit(
  draft: StudentAttendanceAdminEditDraft,
): StudentAttendanceAdminEditValidationResult {
  const errors: StudentAttendanceAdminEditErrors = {};
  const name = draft.name.trim();
  const phone = draft.phone.trim();
  const admissionYear = draft.admissionYear.trim();
  const details = draft.studentCouncilDetails.trim();

  if (!name || name.length > 80) errors.name = '성명을 1~80자로 입력해주세요.';
  if (!isValidMobilePhone(phone)) {
    errors.phone = '01012345678 또는 010-1234-5678 형식으로 입력해주세요.';
  }
  if (admissionYear && !/^\d{2}$/.test(admissionYear)) {
    errors.admissionYear = '학번은 숫자 2자리로 입력해주세요. (예: 24)';
  }
  if (draft.studentCouncilExperience && !details) {
    errors.studentCouncilDetails = '활동 연도와 직책을 입력해주세요.';
  } else if (details.length > 500) {
    errors.studentCouncilDetails = '학생회 활동 내용을 500자 이내로 입력해주세요.';
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
      student_council_experience: draft.studentCouncilExperience,
      student_council_details: draft.studentCouncilExperience ? details : null,
      attendance_status: draft.attendanceStatus as AttendanceResponseStatus,
    },
  };
}

export function updateStudentAttendanceResponseInList(
  responses: StudentAttendanceResponse[],
  id: string,
  value: StudentAttendanceResponseEditableFields,
): StudentAttendanceResponse[] {
  return responses.map((response) => response.id === id ? { ...response, ...value } : response);
}

export function deleteStudentAttendanceResponseFromList(
  responses: StudentAttendanceResponse[],
  id: string,
): StudentAttendanceResponse[] {
  return responses.filter((response) => response.id !== id);
}

export function calculateStudentAttendanceAdminStats(
  responses: StudentAttendanceResponse[],
): StudentAttendanceAdminStats {
  return {
    total: responses.length,
    attending: responses.filter((response) => response.attendance_status === 'attending').length,
    notAttending: responses.filter((response) => response.attendance_status === 'not_attending').length,
    studentCouncilExperienced: responses.filter((response) => response.student_council_experience).length,
  };
}

export function filterStudentAttendanceResponses(
  responses: StudentAttendanceResponse[],
  filters: StudentAttendanceAdminFilters,
): StudentAttendanceResponse[] {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');
  const normalizedPhoneQuery = normalizePhone(filters.query);

  return responses.filter((response) => {
    const matchesQuery = !query
      || response.name.toLocaleLowerCase('ko-KR').includes(query)
      || (normalizedPhoneQuery.length > 0 && response.phone.includes(normalizedPhoneQuery))
      || (response.admission_year?.toLocaleLowerCase('ko-KR').includes(query) ?? false)
      || (response.student_council_details?.toLocaleLowerCase('ko-KR').includes(query) ?? false);
    const matchesStatus = filters.status === 'all' || response.attendance_status === filters.status;
    const matchesStudentCouncil = filters.studentCouncil === 'all'
      || response.student_council_experience === (filters.studentCouncil === 'yes');

    return matchesQuery && matchesStatus && matchesStudentCouncil;
  });
}

export function countStudentAttendanceResponsesByPhone(
  responses: StudentAttendanceResponse[],
): Map<string, number> {
  return responses.reduce((counts, response) => {
    counts.set(response.phone, (counts.get(response.phone) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}
