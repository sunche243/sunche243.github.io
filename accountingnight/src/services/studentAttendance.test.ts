import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('./supabase', () => ({
  getSupabase: () => ({ rpc }),
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
}));

import { submitStudentAttendanceResponse } from './studentAttendance';

const input = {
  name: '김동국',
  phone: '010-1234-5678',
  admissionYear: '24',
  studentCouncilExperience: true,
  studentCouncilDetails: '2025년 학생회장',
  attendanceStatus: 'attending' as const,
  privacyConsent: true,
  selectionCriteriaConsent: true,
  honeypot: '',
  formStartedAt: Date.parse('2026-10-07T00:00:00Z'),
};

describe('student attendance submission service', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 'response-id', error: null });
  });

  it('uses the isolated student attendance RPC and fields', async () => {
    await expect(submitStudentAttendanceResponse(input)).resolves.toBe('response-id');

    expect(rpc).toHaveBeenCalledWith('submit_student_attendance_response', {
      p_name: input.name,
      p_phone: input.phone,
      p_admission_year: input.admissionYear,
      p_student_council_experience: true,
      p_student_council_details: input.studentCouncilDetails,
      p_attendance_status: input.attendanceStatus,
      p_privacy_consent: true,
      p_selection_criteria_consent: true,
      p_website: '',
      p_started_at: '2026-10-07T00:00:00.000Z',
    });
  });

  it('drops stale council details when experience is false', async () => {
    await submitStudentAttendanceResponse({
      ...input,
      studentCouncilExperience: false,
      studentCouncilDetails: '전송되면 안 됨',
    });

    expect(rpc.mock.calls[0][1].p_student_council_details).toBeNull();
  });
});
