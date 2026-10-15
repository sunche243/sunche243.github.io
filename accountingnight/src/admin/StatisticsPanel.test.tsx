import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AttendanceResponse } from '../types/attendance';
import type { Submission } from '../types/registration';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import { StatisticsPanel } from './StatisticsPanel';

const submission: Submission = {
  id: 'submission', created_at: '2026-10-01T00:00:00Z', name: '후원자', phone: '01011111111',
  wants_sponsorship: true, sponsorship_units: 2, pledge_option: 'century_100', pledge_amount: 1_000_000,
  attendance_status: 'attending', answers: {}, status: 'new', admin_memo: '', privacy_consent_at: '2026-10-01T00:00:00Z',
};

const attendance: AttendanceResponse = {
  id: 'attendance', created_at: '2026-10-02T00:00:00Z', name: '참석자', phone: '01022222222', admission_year: '05',
  affiliation: null, attendance_status: 'attending', privacy_consent_at: '2026-10-02T00:00:00Z',
};

const student: StudentAttendanceResponse = {
  id: 'student', created_at: '2026-10-03T00:00:00Z', name: '학생', phone: '01033333333', admission_year: '24',
  student_council_experience: true, student_council_details: '2025년 학생회장', student_council_fee_status: 'paid',
  attendance_status: 'attending', privacy_consent_at: '2026-10-03T00:00:00Z', selection_criteria_consent_at: '2026-10-03T00:00:00Z',
  selection_status: 'selected', waitlist_order: null, participation_fee_status: 'paid', contacted_at: null, admin_memo: '', superseded_at: null,
};

describe('statistics panel', () => {
  it('renders the participant formula and requested student metrics', () => {
    const html = renderToStaticMarkup(
      <StatisticsPanel
        submissions={[submission]}
        attendanceResponses={[attendance]}
        studentAttendanceResponses={[student]}
      />,
    );

    expect(html).toContain('현재 참가자 수');
    expect(html).toContain('발전기금 약정 참석 예정');
    expect(html).toContain('일반 참석 회신');
    expect(html).toContain('학생 선정');
    expect(html).toContain('1 + 1 + 1');
    expect(html).toContain('1순위');
    expect(html).toContain('2순위');
    expect(html).toContain('3순위');
    expect(html).toContain('재학생 불참');
    expect(html).toContain('재학생 참석 신청 합계');
    expect(html).toContain('채널 간 중복은 자동 제거하지 않습니다.');
  });
});
