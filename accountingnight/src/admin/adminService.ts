import type { User } from '@supabase/supabase-js';
import type { FormField, FormFieldType, Submission, SubmissionAnswers, SubmissionStatus } from '../types/registration';
import { getSupabase, SupabaseConfigurationError } from '../services/supabase';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new SupabaseConfigurationError();
  return supabase;
}

function normalizeAnswers(value: unknown): SubmissionAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value).reduce<SubmissionAnswers>((answers, [fieldId, answer]) => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return answers;
    const record = answer as Record<string, unknown>;
    const rawValue = record.value;
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number' && typeof rawValue !== 'boolean') return answers;
    answers[fieldId] = { label: String(record.label ?? '비활성 항목'), value: rawValue };
    return answers;
  }, {});
}

function normalizeSubmission(row: Record<string, unknown>): Submission {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    name: String(row.name),
    phone: String(row.phone),
    wants_sponsorship: Boolean(row.wants_sponsorship),
    sponsorship_units: Number(row.sponsorship_units),
    attendance_status: row.attendance_status as Submission['attendance_status'],
    answers: normalizeAnswers(row.answers),
    status: row.status as SubmissionStatus,
    admin_memo: String(row.admin_memo ?? ''),
    privacy_consent_at: String(row.privacy_consent_at),
  };
}

function normalizeField(row: Record<string, unknown>): FormField {
  return {
    id: String(row.id),
    label: String(row.label),
    type: row.type as FormFieldType,
    required: Boolean(row.required),
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    sort_order: Number(row.sort_order),
    active: Boolean(row.active),
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function verifyAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}

export async function restoreAdminSession(): Promise<boolean> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return false;
  const isAdmin = await verifyAdmin(data.user);
  if (!isAdmin) await supabase.auth.signOut({ scope: 'local' });
  return isAdmin;
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user || !(await verifyAdmin(data.user))) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('관리자 권한을 확인할 수 없습니다.');
  }
}

export async function signOutAdmin(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw new Error('로그아웃하지 못했습니다.');
}

export async function fetchSubmissions(): Promise<Submission[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
  if (error) throw new Error('신청 내역을 불러오지 못했습니다.');
  return (data as Record<string, unknown>[]).map(normalizeSubmission);
}

export async function fetchAllFormFields(): Promise<FormField[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('form_fields').select('*').order('sort_order', { ascending: true });
  if (error) throw new Error('폼 항목을 불러오지 못했습니다.');
  return (data as Record<string, unknown>[]).map(normalizeField);
}

export async function updateSubmission(id: string, status: SubmissionStatus, adminMemo: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('submissions')
    .update({ status, admin_memo: adminMemo.trim() })
    .eq('id', id);
  if (error) throw new Error('신청 상태를 저장하지 못했습니다.');
}

export async function deleteSubmission(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('submissions').delete().eq('id', id);
  if (error) throw new Error('신청 내역을 삭제하지 못했습니다.');
}

export interface FormFieldInput {
  id?: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options: string[];
  sort_order: number;
}

export async function saveFormField(input: FormFieldInput): Promise<void> {
  const supabase = requireSupabase();
  const payload = {
    label: input.label.trim(),
    type: input.type,
    required: input.required,
    options: input.options.map((option) => option.trim()).filter(Boolean),
    sort_order: input.sort_order,
  };
  const query = input.id
    ? supabase.from('form_fields').update(payload).eq('id', input.id)
    : supabase.from('form_fields').insert({ ...payload, active: true });
  const { error } = await query;
  if (error) throw new Error('폼 항목을 저장하지 못했습니다.');
}

export async function setFormFieldActive(id: string, active: boolean): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('form_fields').update({ active }).eq('id', id);
  if (error) throw new Error(active ? '항목을 다시 활성화하지 못했습니다.' : '항목을 비활성화하지 못했습니다.');
}

export async function swapFormFieldOrder(first: FormField, second: FormField): Promise<void> {
  const supabase = requireSupabase();
  const [{ error: firstError }, { error: secondError }] = await Promise.all([
    supabase.from('form_fields').update({ sort_order: second.sort_order }).eq('id', first.id),
    supabase.from('form_fields').update({ sort_order: first.sort_order }).eq('id', second.id),
  ]);
  if (firstError || secondError) throw new Error('항목 순서를 변경하지 못했습니다.');
}
