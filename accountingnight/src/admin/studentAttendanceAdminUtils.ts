import type { AttendanceResponseStatus } from '../types/attendance';
import type {
  StudentAttendanceResponse,
  StudentAttendanceResponseEditableFields,
  StudentCouncilFeeStatus,
  StudentParticipationFeeStatus,
  StudentSelectionManagementFields,
  StudentSelectionStatus,
} from '../types/studentAttendance';
import { isValidMobilePhone, normalizePhone } from '../utils/registration';

export const studentCouncilFeeStatusLabels: Record<StudentCouncilFeeStatus, string> = {
  unverified: '확인 필요',
  paid: '납부',
  unpaid: '미납부',
  not_applicable: '해당 없음',
};

export const studentSelectionStatusLabels: Record<StudentSelectionStatus, string> = {
  pending: '선정 검토',
  selected: '선정',
  waitlisted: '대기',
  not_selected: '미선정',
  cancelled: '취소',
  not_applicable: '해당 없음',
};

export const studentParticipationFeeStatusLabels: Record<StudentParticipationFeeStatus, string> = {
  not_applicable: '해당 없음',
  unpaid: '미납부',
  paid: '납부',
  refund_pending: '환불 대기',
  refunded: '환불 완료',
};

export type StudentSelectionPriority = 1 | 2 | 3 | null;
export type StudentAttendanceAdminSort = 'latest' | 'priority';

export interface StudentAttendanceAdminFilters {
  query: string;
  status: AttendanceResponseStatus | 'all';
  priority: 'all' | '1' | '2' | '3' | 'unverified';
  selectionStatus: StudentSelectionStatus | 'all';
  participationFeeStatus: StudentParticipationFeeStatus | 'all';
}

export interface StudentAttendanceAdminStats {
  total: number;
  attending: number;
  selected: number;
  waitlisted: number;
  participationFeePaid: number;
}

export interface StudentAttendanceAdminEditDraft {
  name: string;
  phone: string;
  admissionYear: string;
  studentCouncilExperience: boolean | null;
  studentCouncilDetails: string;
  studentCouncilFeeStatus: StudentCouncilFeeStatus;
  attendanceStatus: string;
}

export type StudentAttendanceAdminEditErrors = Partial<Record<keyof StudentAttendanceAdminEditDraft, string>>;

export interface StudentAttendanceAdminEditValidationResult {
  valid: boolean;
  errors: StudentAttendanceAdminEditErrors;
  value?: StudentAttendanceResponseEditableFields;
}

export interface StudentSelectionManagementDraft {
  studentCouncilFeeStatus: StudentCouncilFeeStatus;
  selectionStatus: StudentSelectionStatus;
  waitlistOrder: string;
  participationFeeStatus: StudentParticipationFeeStatus;
  contacted: boolean;
  adminMemo: string;
}

export interface StudentSelectionManagementValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  value?: StudentSelectionManagementFields;
}

export function getStudentSelectionPriority(
  response: Pick<StudentAttendanceResponse, 'attendance_status' | 'student_council_experience' | 'student_council_fee_status'>,
): StudentSelectionPriority {
  if (response.attendance_status !== 'attending') return null;
  if (response.student_council_experience === true) return 1;
  if (response.student_council_fee_status === 'paid') return 2;
  if (response.student_council_fee_status === 'unpaid') return 3;
  return null;
}

export function validateStudentAttendanceAdminEdit(
  draft: StudentAttendanceAdminEditDraft,
): StudentAttendanceAdminEditValidationResult {
  const errors: StudentAttendanceAdminEditErrors = {};
  const name = draft.name.trim();
  const phone = draft.phone.trim();
  const admissionYear = draft.admissionYear.trim();
  const details = draft.studentCouncilDetails.trim();
  const attending = draft.attendanceStatus === 'attending';

  if (!name || name.length > 80) errors.name = '성명을 1~80자로 입력해주세요.';
  if (!isValidMobilePhone(phone)) errors.phone = '01012345678 또는 010-1234-5678 형식으로 입력해주세요.';
  if (draft.attendanceStatus !== 'attending' && draft.attendanceStatus !== 'not_attending') {
    errors.attendanceStatus = '참석 여부를 선택해주세요.';
  }

  if (attending) {
    if (!/^\d{2}$/.test(admissionYear)) errors.admissionYear = '학번은 숫자 2자리로 입력해주세요. (예: 24)';
    else if (admissionYear === '26') errors.admissionYear = '26학번은 이번 행사 참석 대상이 아닙니다.';
    if (draft.studentCouncilExperience === null) errors.studentCouncilExperience = '학생회 활동 여부를 선택해주세요.';
    if (draft.studentCouncilExperience === true && !details) {
      errors.studentCouncilDetails = '활동 연도와 직책을 입력해주세요.';
    } else if (details.length > 500) {
      errors.studentCouncilDetails = '학생회 활동 내용을 500자 이내로 입력해주세요.';
    }
    if (!['unverified', 'paid', 'unpaid'].includes(draft.studentCouncilFeeStatus)) {
      errors.studentCouncilFeeStatus = '학생회비 납부 상태를 선택해주세요.';
    }
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors,
    value: {
      name,
      phone: normalizePhone(phone),
      admission_year: attending ? admissionYear : null,
      student_council_experience: attending ? draft.studentCouncilExperience : null,
      student_council_details: attending && draft.studentCouncilExperience ? details : null,
      student_council_fee_status: attending ? draft.studentCouncilFeeStatus : 'not_applicable',
      attendance_status: draft.attendanceStatus as AttendanceResponseStatus,
    },
  };
}

export function validateStudentSelectionManagement(
  response: StudentAttendanceResponse,
  draft: StudentSelectionManagementDraft,
): StudentSelectionManagementValidationResult {
  const errors: Record<string, string> = {};
  const waitlistOrder = draft.waitlistOrder.trim() ? Number(draft.waitlistOrder) : null;
  const adminMemo = draft.adminMemo.trim();

  if (adminMemo.length > 2_000) errors.adminMemo = '관리 메모는 2,000자 이내로 입력해주세요.';

  if (response.attendance_status === 'not_attending') {
    if (draft.studentCouncilFeeStatus !== 'not_applicable') errors.studentCouncilFeeStatus = '불참 회신에는 해당 없음만 선택할 수 있습니다.';
    if (!['cancelled', 'not_applicable'].includes(draft.selectionStatus)) errors.selectionStatus = '불참 회신에는 취소 또는 해당 없음만 선택할 수 있습니다.';
    if (waitlistOrder !== null) errors.waitlistOrder = '불참 회신에는 대기 순번을 입력할 수 없습니다.';
    if (!['not_applicable', 'refund_pending', 'refunded'].includes(draft.participationFeeStatus)) {
      errors.participationFeeStatus = '불참 회신의 참가비 상태를 확인해주세요.';
    }
  } else {
    if (!['unverified', 'paid', 'unpaid'].includes(draft.studentCouncilFeeStatus)) errors.studentCouncilFeeStatus = '학생회비 납부 상태를 선택해주세요.';
    if (!['pending', 'selected', 'waitlisted', 'not_selected', 'cancelled'].includes(draft.selectionStatus)) {
      errors.selectionStatus = '선정 상태를 선택해주세요.';
    }
    if (draft.selectionStatus === 'waitlisted') {
      if (!Number.isSafeInteger(waitlistOrder) || (waitlistOrder ?? 0) <= 0) errors.waitlistOrder = '대기 순번은 1 이상의 정수로 입력해주세요.';
    } else if (waitlistOrder !== null) {
      errors.waitlistOrder = '대기 상태일 때만 대기 순번을 입력할 수 있습니다.';
    }
    if (draft.selectionStatus === 'selected' && !['unpaid', 'paid'].includes(draft.participationFeeStatus)) {
      errors.participationFeeStatus = '선정된 학생의 참가비 납부 상태를 선택해주세요.';
    } else if (draft.selectionStatus === 'cancelled' && !['not_applicable', 'refund_pending', 'refunded'].includes(draft.participationFeeStatus)) {
      errors.participationFeeStatus = '취소된 신청의 환불 상태를 확인해주세요.';
    } else if (!['selected', 'cancelled'].includes(draft.selectionStatus) && draft.participationFeeStatus !== 'not_applicable') {
      errors.participationFeeStatus = '선정 또는 취소 상태에서만 참가비 상태를 관리할 수 있습니다.';
    }
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    errors,
    value: {
      student_council_fee_status: draft.studentCouncilFeeStatus,
      selection_status: draft.selectionStatus,
      waitlist_order: waitlistOrder,
      participation_fee_status: draft.participationFeeStatus,
      contacted: draft.contacted,
      admin_memo: adminMemo,
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

export function updateStudentSelectionManagementInList(
  responses: StudentAttendanceResponse[],
  id: string,
  value: StudentSelectionManagementFields,
): StudentAttendanceResponse[] {
  return responses.map((response) => response.id === id ? {
    ...response,
    student_council_fee_status: value.student_council_fee_status,
    selection_status: value.selection_status,
    waitlist_order: value.waitlist_order,
    participation_fee_status: value.participation_fee_status,
    contacted_at: value.contacted ? response.contacted_at ?? new Date().toISOString() : null,
    admin_memo: value.admin_memo,
  } : response);
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
    selected: responses.filter((response) => response.selection_status === 'selected').length,
    waitlisted: responses.filter((response) => response.selection_status === 'waitlisted').length,
    participationFeePaid: responses.filter((response) => response.participation_fee_status === 'paid').length,
  };
}

export function filterStudentAttendanceResponses(
  responses: StudentAttendanceResponse[],
  filters: StudentAttendanceAdminFilters,
): StudentAttendanceResponse[] {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');
  const normalizedPhoneQuery = normalizePhone(filters.query);

  return responses.filter((response) => {
    const priority = getStudentSelectionPriority(response);
    const matchesQuery = !query
      || response.name.toLocaleLowerCase('ko-KR').includes(query)
      || (normalizedPhoneQuery.length > 0 && response.phone.includes(normalizedPhoneQuery))
      || (response.admission_year?.toLocaleLowerCase('ko-KR').includes(query) ?? false)
      || (response.student_council_details?.toLocaleLowerCase('ko-KR').includes(query) ?? false)
      || response.admin_memo.toLocaleLowerCase('ko-KR').includes(query);
    const matchesStatus = filters.status === 'all' || response.attendance_status === filters.status;
    const matchesPriority = filters.priority === 'all'
      || (filters.priority === 'unverified'
        ? response.attendance_status === 'attending' && priority === null
        : priority === Number(filters.priority));
    const matchesSelection = filters.selectionStatus === 'all' || response.selection_status === filters.selectionStatus;
    const matchesParticipationFee = filters.participationFeeStatus === 'all'
      || response.participation_fee_status === filters.participationFeeStatus;

    return matchesQuery && matchesStatus && matchesPriority && matchesSelection && matchesParticipationFee;
  });
}

export function sortStudentAttendanceResponses(
  responses: StudentAttendanceResponse[],
  sort: StudentAttendanceAdminSort,
): StudentAttendanceResponse[] {
  return [...responses].sort((left, right) => {
    if (sort === 'priority') {
      const leftPriority = getStudentSelectionPriority(left);
      const rightPriority = getStudentSelectionPriority(right);
      const leftGroup = leftPriority ?? (left.attendance_status === 'attending' ? 4 : 5);
      const rightGroup = rightPriority ?? (right.attendance_status === 'attending' ? 4 : 5);
      if (leftGroup !== rightGroup) return leftGroup - rightGroup;

      const nameOrder = left.name.localeCompare(right.name, 'ko-KR');
      if (nameOrder !== 0) return nameOrder;
    }

    const leftTime = Date.parse(left.updated_at ?? left.created_at);
    const rightTime = Date.parse(right.updated_at ?? right.created_at);
    if (leftTime !== rightTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}
