import { describe, expect, it } from 'vitest';
import type { AttendanceResponse } from '../types/attendance';
import type { Submission } from '../types/registration';
import { calculateAdminStats } from './adminUtils';
import { calculateAttendanceAdminStats, filterAttendanceResponses } from './attendanceAdminUtils';

const attending: AttendanceResponse = {
  id: 'attendance-1',
  created_at: '2026-10-01T00:00:00Z',
  name: '홍길동',
  phone: '01012345678',
  admission_year: '98',
  affiliation: '삼일회계법인 파트너',
  attendance_status: 'attending',
  privacy_consent_at: '2026-10-01T00:00:00Z',
};

const notAttending: AttendanceResponse = {
  ...attending,
  id: 'attendance-2',
  name: '김동국',
  phone: '01087654321',
  admission_year: '08',
  affiliation: '동국대학교',
  attendance_status: 'not_attending',
};

describe('attendance admin utilities', () => {
  it('calculates total, attending, not-attending, and rate from attendance responses only', () => {
    expect(calculateAttendanceAdminStats([attending, notAttending])).toEqual({
      total: 2,
      attending: 1,
      notAttending: 1,
      attendanceRate: 50,
    });
  });

  it.each(['홍길', '010-1234', '98', '삼일회계'])('searches name, phone, admission year, and affiliation: %s', (query) => {
    expect(filterAttendanceResponses([attending, notAttending], { query, status: 'all' })).toEqual([attending]);
  });

  it('filters attendance data independently by status', () => {
    expect(filterAttendanceResponses([attending, notAttending], { query: '', status: 'not_attending' })).toEqual([notAttending]);
  });

  it('keeps attendance response totals separate from legacy submissions totals', () => {
    const submission: Submission = {
      id: 'submission-1',
      created_at: '2026-10-01T00:00:00Z',
      name: '기존 신청자',
      phone: '01011112222',
      wants_sponsorship: true,
      sponsorship_units: 2,
      pledge_option: 'century_100',
      pledge_amount: 1_000_000,
      attendance_status: 'attending',
      answers: {},
      status: 'new',
      admin_memo: '',
      privacy_consent_at: '2026-10-01T00:00:00Z',
    };

    expect(calculateAdminStats([submission]).totalResponses).toBe(1);
    expect(calculateAttendanceAdminStats([attending, notAttending]).total).toBe(2);
  });
});
