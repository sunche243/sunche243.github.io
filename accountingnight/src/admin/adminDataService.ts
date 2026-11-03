import { getSupabase, SupabaseConfigurationError } from '../services/supabase';
import type { AdminManualResponseInput } from './adminDataTypes';

export async function createAdminManualResponse(input: AdminManualResponseInput): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new SupabaseConfigurationError();

  const { data, error } = await supabase.rpc('create_admin_response', {
    p_response_type: input.responseType,
    p_name: input.name,
    p_phone: input.phone,
    p_admission_year: input.admissionYear,
    p_affiliation: input.affiliation,
    p_pledge_amount: input.pledgeAmount,
    p_attendance_status: input.attendanceStatus,
    p_student_council_experience: input.studentCouncilExperience,
    p_student_council_details: input.studentCouncilDetails,
    p_student_council_fee_status: input.studentCouncilFeeStatus,
    p_admin_memo: input.adminMemo,
  });

  if (error) throw new Error('데이터를 등록하지 못했습니다. 관리자 권한과 DB 마이그레이션 적용 여부를 확인해주세요.');
  return String(data);
}
