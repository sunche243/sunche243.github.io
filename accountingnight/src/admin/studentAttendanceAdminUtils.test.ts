import { describe, expect, it } from 'vitest';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import {
  calculateStudentAttendanceAdminStats,
  deleteStudentAttendanceResponseFromList,
  filterStudentAttendanceResponses,
  updateStudentAttendanceResponseInList,
  validateStudentAttendanceAdminEdit,
} from './studentAttendanceAdminUtils';

const experienced: StudentAttendanceResponse = {
  id: 'student-1',
  created_at: '2026-10-07T00:00:00Z',
  name: '김동국',
  phone: '01012345678',
  admission_year: '24',
  student_council_experience: true,
  student_council_details: '2025년 학생회장',
  attendance_status: 'attending',
  privacy_consent_at: '2026-10-07T00:00:00Z',
  selection_criteria_consent_at: '2026-10-07T00:00:00Z',
};

const inexperienced: StudentAttendanceResponse = {
  ...experienced,
  id: 'student-2',
  name: '이회계',
  phone: '01099998888',
  student_council_experience: false,
  student_council_details: null,
  attendance_status: 'not_attending',
};

const validDraft = {
  name: '김동국',
  phone: '010-1234-5678',
  admissionYear: '24',
  studentCouncilExperience: true,
  studentCouncilDetails: '2025년 학생회장',
  attendanceStatus: 'attending',
};

describe('student attendance admin utilities', () => {
  it('calculates student-only attendance and council stats', () => {
    expect(calculateStudentAttendanceAdminStats([experienced, inexperienced])).toEqual({
      total: 2,
      attending: 1,
      notAttending: 1,
      studentCouncilExperienced: 1,
    });
  });

  it('filters by attendance, council experience, and council details text', () => {
    expect(filterStudentAttendanceResponses([experienced, inexperienced], {
      query: '학생회장',
      status: 'attending',
      studentCouncil: 'yes',
    })).toEqual([experienced]);
    expect(filterStudentAttendanceResponses([experienced, inexperienced], {
      query: '',
      status: 'all',
      studentCouncil: 'no',
    })).toEqual([inexperienced]);
  });

  it('requires details only for students with council experience', () => {
    expect(validateStudentAttendanceAdminEdit({
      ...validDraft,
      studentCouncilDetails: '',
    }).errors.studentCouncilDetails).toBeTruthy();

    const noExperience = validateStudentAttendanceAdminEdit({
      ...validDraft,
      studentCouncilExperience: false,
      studentCouncilDetails: 'discarded',
    });
    expect(noExperience.valid).toBe(true);
    expect(noExperience.value?.student_council_details).toBeNull();
  });

  it('updates and deletes student responses without touching immutable timestamps', () => {
    const value = {
      name: '김동국 수정',
      phone: experienced.phone,
      admission_year: experienced.admission_year,
      student_council_experience: false,
      student_council_details: null,
      attendance_status: 'not_attending' as const,
    };
    const updated = updateStudentAttendanceResponseInList([experienced], experienced.id, value);

    expect(updated[0]).toMatchObject({ ...value, created_at: experienced.created_at });
    expect(deleteStudentAttendanceResponseFromList(updated, experienced.id)).toEqual([]);
  });
});
