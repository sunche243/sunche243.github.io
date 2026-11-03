export type AdminResponseType = 'sponsorship' | 'attendance' | 'student';

export type OptionalBooleanChoice = '' | 'yes' | 'no';
export type OptionalAttendanceChoice = '' | 'attending' | 'not_attending';
export type OptionalStudentCouncilFeeChoice = '' | 'unverified' | 'paid' | 'unpaid' | 'not_applicable';

export interface AdminManualResponseDraft {
  responseType: AdminResponseType;
  name: string;
  phone: string;
  admissionYear: string;
  affiliation: string;
  pledgeAmount: string;
  attendanceStatus: OptionalAttendanceChoice;
  studentCouncilExperience: OptionalBooleanChoice;
  studentCouncilDetails: string;
  studentCouncilFeeStatus: OptionalStudentCouncilFeeChoice;
  adminMemo: string;
}

export type AdminManualResponseErrors = Partial<Record<keyof AdminManualResponseDraft, string>>;

export interface AdminManualResponseInput {
  responseType: AdminResponseType;
  name: string | null;
  phone: string | null;
  admissionYear: string | null;
  affiliation: string | null;
  pledgeAmount: number | null;
  attendanceStatus: 'attending' | 'not_attending' | null;
  studentCouncilExperience: boolean | null;
  studentCouncilDetails: string | null;
  studentCouncilFeeStatus: Exclude<OptionalStudentCouncilFeeChoice, ''> | null;
  adminMemo: string | null;
}

export const emptyAdminManualResponseDraft = (responseType: AdminResponseType = 'sponsorship'): AdminManualResponseDraft => ({
  responseType,
  name: '',
  phone: '',
  admissionYear: '',
  affiliation: '',
  pledgeAmount: '',
  attendanceStatus: '',
  studentCouncilExperience: '',
  studentCouncilDetails: '',
  studentCouncilFeeStatus: '',
  adminMemo: '',
});
