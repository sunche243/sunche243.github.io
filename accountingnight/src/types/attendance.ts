export type AttendanceResponseStatus = 'attending' | 'not_attending';

export interface AttendanceResponse {
  id: string;
  created_at: string;
  updated_at?: string;
  name: string;
  phone: string;
  admission_year: string | null;
  affiliation: string | null;
  attendance_status: AttendanceResponseStatus;
  privacy_consent_at: string;
}

export interface AttendanceDraft {
  name: string;
  phone: string;
  admissionYear: string;
  affiliation: string;
  attendanceStatus: AttendanceResponseStatus | null;
  privacyConsent: boolean;
}
