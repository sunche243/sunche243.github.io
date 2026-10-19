import { describe, expect, it } from 'vitest';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import { selectedStudentsForSeating } from './seatingTransfer';

const base: StudentAttendanceResponse = {
  id: '1', created_at: '2026-10-01T00:00:00Z', name: '김동국', phone: '01012345678', admission_year: '24',
  student_council_experience: false, student_council_details: null, student_council_fee_status: 'paid', attendance_status: 'attending',
  privacy_consent_at: '2026-10-01T00:00:00Z', selection_criteria_consent_at: '2026-10-01T00:00:00Z', selection_status: 'selected',
  waitlist_order: null, participation_fee_status: 'paid', contacted_at: null, admin_memo: '', superseded_at: null,
};

describe('selected student seating transfer', () => {
  it('includes only attending students whose final status is selected', () => {
    const people = selectedStudentsForSeating([
      { ...base, id: '2', name: '박선정' },
      { ...base, id: '3', name: '이대기', selection_status: 'waitlisted' },
      { ...base, id: '4', name: '최불참', attendance_status: 'not_attending' },
    ]);
    expect(people).toEqual([{ id: 'student-2', name: '박선정', group: '24학번', identifier: '01012345678' }]);
  });
});
