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
export type PledgeOption =
  | 'century_100'
  | 'guardian_50'
  | 'free_attending'
  | 'free_absent'
  | 'absent_only';
export type StoredPledgeOption = PledgeOption | 'legacy_units' | 'legacy_no_pledge';
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
  pledge_option: StoredPledgeOption | null;
  pledge_amount: number;
  attendance_status: AttendanceStatus | null;
  answers: SubmissionAnswers;
  status: SubmissionStatus;
  admin_memo: string;
  privacy_consent_at: string;
}

export interface RegistrationDraft {
  name: string;
  phone: string;
  pledgeOption: PledgeOption | null;
  pledgeAmount: number;
  privacyConsent: boolean;
}

export type DynamicAnswers = Record<string, DynamicAnswerValue>;
