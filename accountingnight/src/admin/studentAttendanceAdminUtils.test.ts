import { describe, expect, it } from 'vitest';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import {
  calculateStudentAttendanceAdminStats,
  deleteStudentAttendanceResponseFromList,
  filterStudentAttendanceResponses,
  getStudentSelectionPriority,
  sortStudentAttendanceResponses,
  updateStudentAttendanceResponseInList,
  validateStudentAttendanceAdminEdit,
  validateStudentSelectionManagement,
} from './studentAttendanceAdminUtils';

const experienced: StudentAttendanceResponse = {
  id: 'student-1', created_at: '2026-10-07T00:00:00Z', updated_at: '2026-10-08T00:00:00Z',
  name: '김동국', phone: '01012345678', admission_year: '24',
  student_council_experience: true, student_council_details: '2025년 학생회장',
  student_council_fee_status: 'paid', attendance_status: 'attending',
  privacy_consent_at: '2026-10-07T00:00:00Z', selection_criteria_consent_at: '2026-10-07T00:00:00Z',
  selection_status: 'selected', waitlist_order: null, participation_fee_status: 'paid',
  contacted_at: '2026-10-08T00:00:00Z', admin_memo: '안내 완료', superseded_at: null,
};

const inexperienced: StudentAttendanceResponse = {
  ...experienced,
  id: 'student-2', name: '이회계', phone: '01099998888',
  student_council_experience: false, student_council_details: null,
  student_council_fee_status: 'unpaid', selection_status: 'waitlisted', waitlist_order: 3,
  participation_fee_status: 'not_applicable', contacted_at: null, admin_memo: '',
};

const validDraft = {
  name: '김동국', phone: '010-1234-5678', admissionYear: '24',
  studentCouncilExperience: true, studentCouncilDetails: '2025년 학생회장',
  studentCouncilFeeStatus: 'paid' as const, attendanceStatus: 'attending',
};

describe('student attendance admin utilities', () => {
  it('derives the three selection priorities without storing a duplicate priority field', () => {
    expect(getStudentSelectionPriority(experienced)).toBe(1);
    expect(getStudentSelectionPriority({ ...inexperienced, student_council_fee_status: 'paid' })).toBe(2);
    expect(getStudentSelectionPriority(inexperienced)).toBe(3);
    expect(getStudentSelectionPriority({ ...inexperienced, student_council_fee_status: 'unverified' })).toBeNull();
  });

  it('calculates selection and participation-fee stats', () => {
    expect(calculateStudentAttendanceAdminStats([experienced, inexperienced])).toEqual({
      total: 2, attending: 2, selected: 1, waitlisted: 1, participationFeePaid: 1,
    });
  });

  it('filters by priority, selection state, fee state, and text', () => {
    expect(filterStudentAttendanceResponses([experienced, inexperienced], {
      query: '학생회장', status: 'attending', priority: '1', selectionStatus: 'selected', participationFeeStatus: 'paid',
    })).toEqual([experienced]);
    expect(filterStudentAttendanceResponses([experienced, inexperienced], {
      query: '', status: 'all', priority: '3', selectionStatus: 'waitlisted', participationFeeStatus: 'all',
    })).toEqual([inexperienced]);
  });

  it('sorts by priority and then by Korean name within the same priority', () => {
    const priorityTwoKim = {
      ...inexperienced,
      id: 'student-3',
      name: '김회계',
      student_council_fee_status: 'paid' as const,
    };
    const priorityTwoPark = {
      ...inexperienced,
      id: 'student-4',
      name: '박회계',
      student_council_fee_status: 'paid' as const,
    };
    const sorted = sortStudentAttendanceResponses(
      [inexperienced, priorityTwoPark, experienced, priorityTwoKim],
      'priority',
    );

    expect(sorted.map((item) => item.name)).toEqual(['김동국', '김회계', '박회계', '이회계']);
  });

  it('validates applicant fields and rejects 26 admission year', () => {
    expect(validateStudentAttendanceAdminEdit({ ...validDraft, studentCouncilDetails: '' }).errors.studentCouncilDetails).toBeTruthy();
    expect(validateStudentAttendanceAdminEdit({ ...validDraft, admissionYear: '26' }).errors.admissionYear).toBeTruthy();
    const noExperience = validateStudentAttendanceAdminEdit({ ...validDraft, studentCouncilExperience: false, studentCouncilDetails: 'discarded' });
    expect(noExperience.valid).toBe(true);
    expect(noExperience.value?.student_council_details).toBeNull();
  });

  it('requires a positive waitlist order only for waitlisted applicants', () => {
    expect(validateStudentSelectionManagement(inexperienced, {
      studentCouncilFeeStatus: 'unpaid', selectionStatus: 'waitlisted', waitlistOrder: '',
      participationFeeStatus: 'not_applicable', contacted: false, adminMemo: '',
    }).errors.waitlistOrder).toBeTruthy();
    expect(validateStudentSelectionManagement(inexperienced, {
      studentCouncilFeeStatus: 'unpaid', selectionStatus: 'waitlisted', waitlistOrder: '3',
      participationFeeStatus: 'not_applicable', contacted: false, adminMemo: '',
    }).valid).toBe(true);
  });

  it('updates and deletes responses without touching immutable timestamps', () => {
    const value = {
      name: '김동국 수정', phone: experienced.phone, admission_year: null,
      student_council_experience: null, student_council_details: null,
      student_council_fee_status: 'not_applicable' as const, attendance_status: 'not_attending' as const,
    };
    const updated = updateStudentAttendanceResponseInList([experienced], experienced.id, value);
    expect(updated[0]).toMatchObject({ ...value, created_at: experienced.created_at });
    expect(deleteStudentAttendanceResponseFromList(updated, experienced.id)).toEqual([]);
  });
});
