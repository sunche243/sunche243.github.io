import type { AttendanceResponseStatus } from '../types/attendance';
import { getSupabase, SupabaseConfigurationError } from './supabase';

export interface SubmitStudentAttendanceResponseInput {
  name: string;
  phone: string;
  admissionYear: string;
  studentCouncilExperience: boolean | null;
  studentCouncilDetails: string;
  studentCouncilFeePaid: boolean | null;
  attendanceStatus: AttendanceResponseStatus;
  privacyConsent: boolean;
  selectionCriteriaConsent: boolean;
  honeypot: string;
  formStartedAt: number;
}

export async function submitStudentAttendanceResponse(
  input: SubmitStudentAttendanceResponseInput,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new SupabaseConfigurationError();

  const attending = input.attendanceStatus === 'attending';
  const studentCouncilExperience = attending ? input.studentCouncilExperience : null;

  const { data, error } = await supabase.rpc('submit_student_attendance_response', {
    p_name: input.name,
    p_phone: input.phone,
    p_admission_year: attending ? input.admissionYear || null : null,
    p_student_council_experience: studentCouncilExperience,
    p_student_council_details: studentCouncilExperience
      ? input.studentCouncilDetails
      : null,
    p_student_council_fee_paid: attending ? input.studentCouncilFeePaid : null,
    p_attendance_status: input.attendanceStatus,
    p_privacy_consent: input.privacyConsent,
    p_selection_criteria_consent: attending ? input.selectionCriteriaConsent : false,
    p_website: input.honeypot,
    p_started_at: new Date(input.formStartedAt).toISOString(),
  });

  if (error) throw new Error('학생 참석 여부를 전달하지 못했습니다. 잠시 후 다시 시도해주세요.');
  return String(data);
}
