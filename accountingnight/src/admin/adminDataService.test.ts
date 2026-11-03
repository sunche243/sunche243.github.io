import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminManualResponseInput } from './adminDataTypes';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../services/supabase', () => ({
  getSupabase: () => ({ rpc }),
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
}));

import { createAdminManualResponse } from './adminDataService';

const input: AdminManualResponseInput = {
  responseType: 'student',
  name: null,
  phone: null,
  admissionYear: '24',
  affiliation: null,
  pledgeAmount: null,
  attendanceStatus: 'attending',
  studentCouncilExperience: true,
  studentCouncilDetails: '2024년 2학기 총무부장',
  studentCouncilFeeStatus: 'paid',
  adminMemo: null,
};

describe('admin manual data service', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 'response-id', error: null });
  });

  it('uses the authenticated admin-only RPC and preserves omitted values as null', async () => {
    await createAdminManualResponse(input);

    expect(rpc).toHaveBeenCalledWith('create_admin_response', {
      p_response_type: 'student',
      p_name: null,
      p_phone: null,
      p_admission_year: '24',
      p_affiliation: null,
      p_pledge_amount: null,
      p_attendance_status: 'attending',
      p_student_council_experience: true,
      p_student_council_details: '2024년 2학기 총무부장',
      p_student_council_fee_status: 'paid',
      p_admin_memo: null,
    });
  });

  it('does not expose database error details', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'database detail' } });

    await expect(createAdminManualResponse(input)).rejects.toThrow('관리자 권한과 DB 마이그레이션');
  });
});
