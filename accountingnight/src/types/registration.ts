export const FORM_FIELD_TYPES = [
  'text',
  'number',
  'tel',
  'email',
  'select',
  'radio',
  'checkbox',
  'textarea',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];
export type AttendanceStatus = 'attending' | 'not_attending' | 'undecided';
export type SubmissionStatus = 'new' | 'contacted' | 'confirmed' | 'cancelled';
export type DynamicAnswerValue = string | number | boolean;

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SubmissionAnswer {
  label: string;
  value: DynamicAnswerValue;
}

export type SubmissionAnswers = Record<string, SubmissionAnswer>;

export interface Submission {
  id: string;
  created_at: string;
  updated_at?: string;
  name: string;
  phone: string;
  wants_sponsorship: boolean;
  sponsorship_units: number;
  attendance_status: AttendanceStatus | null;
  answers: SubmissionAnswers;
  status: SubmissionStatus;
  admin_memo: string;
  privacy_consent_at: string;
}

export interface RegistrationDraft {
  name: string;
  phone: string;
  wantsSponsorship: boolean;
  sponsorshipUnits: number;
  attendanceStatus: AttendanceStatus | null;
  privacyConsent: boolean;
}

export type DynamicAnswers = Record<string, DynamicAnswerValue>;
