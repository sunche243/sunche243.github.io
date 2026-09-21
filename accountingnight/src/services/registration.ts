import type { AttendanceStatus, DynamicAnswers, FormField, PledgeOption } from '../types/registration';
import { getSupabase, SupabaseConfigurationError } from './supabase';

function normalizeField(row: Record<string, unknown>): FormField {
  return {
    id: String(row.id),
    label: String(row.label),
    type: row.type as FormField['type'],
    required: Boolean(row.required),
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    sort_order: Number(row.sort_order),
    active: Boolean(row.active),
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function fetchActiveFormFields(): Promise<FormField[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('form_fields')
    .select('id,label,type,required,options,sort_order,active,created_at,updated_at')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error('추가 질문을 불러오지 못했습니다.');
  return (data as Record<string, unknown>[]).map(normalizeField);
}

export interface SubmitRegistrationInput {
  name: string;
  phone: string;
  pledgeOption: PledgeOption;
  pledgeAmount: number;
  attendanceStatus: Exclude<AttendanceStatus, 'undecided'>;
  answers: DynamicAnswers;
  privacyConsent: boolean;
  honeypot: string;
  formStartedAt: number;
}

export async function submitRegistration(input: SubmitRegistrationInput): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new SupabaseConfigurationError();

  const { data, error } = await supabase.rpc('submit_sponsorship', {
    p_name: input.name,
    p_phone: input.phone,
    p_pledge_option: input.pledgeOption,
    p_pledge_amount: input.pledgeAmount,
    p_attendance_status: input.attendanceStatus,
    p_answers: input.answers,
    p_privacy_consent: input.privacyConsent,
    p_website: input.honeypot,
    p_started_at: new Date(input.formStartedAt).toISOString(),
  });

  if (error) throw new Error('신청 정보를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.');
  return String(data);
}
