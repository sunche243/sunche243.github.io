import type { AttendanceResponseStatus } from './attendance';

export interface StudentAttendanceResponse {
  id: string;
  created_at: string;
  updated_at?: string;
  name: string;
  phone: string;
  admission_year: string | null;
  student_council_experience: boolean;
  student_council_details: string | null;
  attendance_status: AttendanceResponseStatus;
  privacy_consent_at: string;
}

export interface StudentAttendanceResponseEditableFields {
  name: string;
  phone: string;
  admission_year: string | null;
  student_council_experience: boolean;
  student_council_details: string | null;
  attendance_status: AttendanceResponseStatus;
}

export interface StudentAttendanceDraft {
  name: string;
  phone: string;
  admissionYear: string;
  studentCouncilExperience: boolean | null;
  studentCouncilDetails: string;
  attendanceStatus: AttendanceResponseStatus | null;
  privacyConsent: boolean;
}
