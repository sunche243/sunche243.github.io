import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentAttendanceResponseEditableFields, StudentSelectionManagementFields } from '../types/studentAttendance';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../services/supabase', () => ({
  getSupabase: () => ({ rpc }),
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
}));

import { deleteStudentAttendanceResponse, updateStudentAttendanceResponse, updateStudentSelectionManagement } from './adminService';

const id = '11111111-1111-4111-8111-111111111111';
const value: StudentAttendanceResponseEditableFields = {
  name: '김동국',
  phone: '01012345678',
  admission_year: '24',
  student_council_experience: true,
  student_council_details: '2025년 학생회장',
  student_council_fee_status: 'paid',
  attendance_status: 'attending',
};

describe('student attendance admin mutation service', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ error: null });
  });

  it('uses the student-only update RPC fields', async () => {
    await updateStudentAttendanceResponse(id, value);

    expect(rpc).toHaveBeenCalledWith('update_student_attendance_response', {
      p_id: id,
      p_name: value.name,
      p_phone: value.phone,
      p_admission_year: value.admission_year,
      p_student_council_experience: value.student_council_experience,
      p_student_council_details: value.student_council_details,
      p_student_council_fee_status: value.student_council_fee_status,
      p_attendance_status: value.attendance_status,
    });
  });

  it('uses the admin-only student selection management RPC', async () => {
    const management: StudentSelectionManagementFields = {
      student_council_fee_status: 'paid',
      selection_status: 'selected',
      waitlist_order: null,
      participation_fee_status: 'unpaid',
      contacted: true,
      admin_memo: '선정 안내',
    };

    await updateStudentSelectionManagement(id, management);
    expect(rpc).toHaveBeenCalledWith('update_student_selection_management', {
      p_id: id,
      p_student_council_fee_status: 'paid',
      p_selection_status: 'selected',
      p_waitlist_order: null,
      p_participation_fee_status: 'unpaid',
      p_contacted: true,
      p_admin_memo: '선정 안내',
    });
  });

  it('uses the student-only delete RPC', async () => {
    await deleteStudentAttendanceResponse(id);
    expect(rpc).toHaveBeenCalledWith('delete_student_attendance_response', { p_id: id });
  });
});
