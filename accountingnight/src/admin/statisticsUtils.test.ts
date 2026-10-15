import { describe, expect, it } from 'vitest';
import type { AttendanceResponse } from '../types/attendance';
import type { Submission } from '../types/registration';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import { calculateAdminDashboardStatistics } from './statisticsUtils';

const sponsorshipAttending: Submission = {
  id: 'sponsor-attending', created_at: '2026-10-01T00:00:00Z', name: '후원 참석', phone: '01011111111',
  wants_sponsorship: true, sponsorship_units: 2, pledge_option: 'century_100', pledge_amount: 1_000_000,
  attendance_status: 'attending', answers: {}, status: 'new', admin_memo: '', privacy_consent_at: '2026-10-01T00:00:00Z',
};

const sponsorshipAbsent: Submission = {
  ...sponsorshipAttending,
  id: 'sponsor-absent', name: '후원 불참', phone: '01022222222', pledge_option: 'free_absent',
  pledge_amount: 100_000, sponsorship_units: 0, attendance_status: 'not_attending',
};

const generalAttending: AttendanceResponse = {
  id: 'general-attending', created_at: '2026-10-02T00:00:00Z', name: '일반 참석', phone: '01033333333',
  admission_year: '05', affiliation: null, attendance_status: 'attending', privacy_consent_at: '2026-10-02T00:00:00Z',
};

const generalAbsent: AttendanceResponse = {
  ...generalAttending,
  id: 'general-absent', name: '일반 불참', phone: '01044444444', attendance_status: 'not_attending',
};

const studentBase: StudentAttendanceResponse = {
  id: 'student-one', created_at: '2026-10-03T00:00:00Z', name: '학생 일', phone: '01055555555', admission_year: '24',
  student_council_experience: true, student_council_details: '2025년 학생회장', student_council_fee_status: 'paid',
  attendance_status: 'attending', privacy_consent_at: '2026-10-03T00:00:00Z', selection_criteria_consent_at: '2026-10-03T00:00:00Z',
  selection_status: 'selected', waitlist_order: null, participation_fee_status: 'paid', contacted_at: null, admin_memo: '', superseded_at: null,
};

const students: StudentAttendanceResponse[] = [
  studentBase,
  {
    ...studentBase, id: 'student-two', name: '학생 이', phone: '01066666666', student_council_experience: false,
    student_council_details: null, student_council_fee_status: 'paid', selection_status: 'pending', participation_fee_status: 'not_applicable',
  },
  {
    ...studentBase, id: 'student-three', name: '학생 삼', phone: '01077777777', student_council_experience: false,
    student_council_details: null, student_council_fee_status: 'unpaid', selection_status: 'waitlisted', waitlist_order: 1,
    participation_fee_status: 'not_applicable',
  },
  {
    ...studentBase, id: 'student-unverified', name: '학생 확인', phone: '01088888888', student_council_experience: false,
    student_council_details: null, student_council_fee_status: 'unverified', selection_status: 'not_selected', participation_fee_status: 'not_applicable',
  },
  {
    ...studentBase, id: 'student-selected-unpaid', name: '학생 미납', phone: '01099999999', student_council_experience: false,
    student_council_details: null, student_council_fee_status: 'unpaid', selection_status: 'selected', participation_fee_status: 'unpaid',
  },
  {
    ...studentBase, id: 'student-absent', name: '학생 불참', phone: '01000000000', admission_year: null,
    student_council_experience: null, student_council_details: null, student_council_fee_status: 'not_applicable',
    attendance_status: 'not_attending', selection_criteria_consent_at: null, selection_status: 'cancelled', participation_fee_status: 'not_applicable',
  },
];

describe('admin dashboard statistics', () => {
  it('calculates participant totals, student priorities, selection states, and operational figures', () => {
    const stats = calculateAdminDashboardStatistics(
      [
        sponsorshipAttending,
        sponsorshipAbsent,
        { ...sponsorshipAttending, id: 'cancelled', status: 'cancelled' },
      ],
      [generalAttending, generalAbsent],
      students,
    );

    expect(stats).toEqual({
      currentParticipants: 4,
      sponsorshipAttendees: 1,
      generalAttendees: 1,
      studentSelected: 2,
      totalCurrentResponses: 10,
      pledgeCount: 2,
      totalPledgeAmount: 1_100_000,
      sponsorshipNotAttending: 1,
      generalNotAttending: 1,
      studentApplications: 5,
      studentNotAttending: 1,
      studentPriorityOne: 1,
      studentPriorityTwo: 1,
      studentPriorityThree: 2,
      studentPriorityUnverified: 1,
      studentPending: 1,
      studentWaitlisted: 1,
      studentNotSelected: 1,
      studentCancelled: 1,
      studentParticipationFeePaid: 1,
      studentParticipationFeeUnpaid: 1,
      studentSelectionRate: 40,
    });
  });

  it('returns a zero selection rate when there are no student applications', () => {
    expect(calculateAdminDashboardStatistics([], [], []).studentSelectionRate).toBe(0);
  });
});
