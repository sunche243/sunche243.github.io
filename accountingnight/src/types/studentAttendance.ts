import type { AttendanceResponseStatus } from './attendance';

export type StudentCouncilFeeStatus = 'unverified' | 'paid' | 'unpaid' | 'not_applicable';
export type StudentSelectionStatus =
  | 'pending'
  | 'selected'
  | 'waitlisted'
  | 'not_selected'
  | 'cancelled'
  | 'not_applicable';
export type StudentParticipationFeeStatus =
  | 'not_applicable'
  | 'unpaid'
  | 'paid'
  | 'refund_pending'
  | 'refunded';

export interface StudentAttendanceResponse {
  id: string;
  created_at: string;
  updated_at?: string;
  name: string;
  phone: string;
  admission_year: string | null;
  student_council_experience: boolean | null;
  student_council_details: string | null;
  student_council_fee_status: StudentCouncilFeeStatus;
  attendance_status: AttendanceResponseStatus;
  privacy_consent_at: string;
  selection_criteria_consent_at: string | null;
  selection_status: StudentSelectionStatus;
  waitlist_order: number | null;
  participation_fee_status: StudentParticipationFeeStatus;
  contacted_at: string | null;
  admin_memo: string;
  superseded_at: string | null;
}

export interface StudentAttendanceResponseEditableFields {
  name: string;
  phone: string;
  admission_year: string | null;
  student_council_experience: boolean | null;
  student_council_details: string | null;
  student_council_fee_status: StudentCouncilFeeStatus;
  attendance_status: AttendanceResponseStatus;
}

export interface StudentSelectionManagementFields {
  student_council_fee_status: StudentCouncilFeeStatus;
  selection_status: StudentSelectionStatus;
  waitlist_order: number | null;
  participation_fee_status: StudentParticipationFeeStatus;
  contacted: boolean;
  admin_memo: string;
}

export interface StudentAttendanceDraft {
  name: string;
  phone: string;
  admissionYear: string;
  studentCouncilExperience: boolean | null;
  studentCouncilDetails: string;
  studentCouncilFeePaid: boolean | null;
  attendanceStatus: AttendanceResponseStatus | null;
  privacyConsent: boolean;
  selectionCriteriaConsent: boolean;
}
