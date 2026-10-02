import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttendanceResponseEditableFields } from '../types/attendance';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../services/supabase', () => ({
  getSupabase: () => ({ rpc }),
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
}));

import { deleteAttendanceResponse, updateAttendanceResponse } from './adminService';

const id = '11111111-1111-4111-8111-111111111111';
const value: AttendanceResponseEditableFields = {
  name: '박찬준',
  phone: '01012345678',
  admission_year: '08',
  affiliation: '동국대학교',
  attendance_status: 'not_attending',
};

describe('attendance admin mutation service', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ error: null });
  });

  it('uses the dedicated update RPC with attendance-only fields', async () => {
    await updateAttendanceResponse(id, value);

    expect(rpc).toHaveBeenCalledWith('update_attendance_response', {
      p_id: id,
      p_name: value.name,
      p_phone: value.phone,
      p_admission_year: value.admission_year,
      p_affiliation: value.affiliation,
      p_attendance_status: value.attendance_status,
    });
  });

  it('uses the dedicated delete RPC', async () => {
    await deleteAttendanceResponse(id);

    expect(rpc).toHaveBeenCalledWith('delete_attendance_response', { p_id: id });
  });

  it('maps database mutation errors to non-sensitive admin messages', async () => {
    rpc.mockResolvedValue({ error: { message: 'database detail' } });

    await expect(updateAttendanceResponse(id, value)).rejects.toThrow('응답 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    await expect(deleteAttendanceResponse(id)).rejects.toThrow('응답 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  });
});
