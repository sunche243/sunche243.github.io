import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import {
  StudentAttendanceDeleteDialog,
  StudentAttendanceEditDialog,
  StudentAttendanceResponsesPanel,
  StudentSelectionManagementDialog,
} from './StudentAttendanceResponsesPanel';

const response: StudentAttendanceResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-10-07T00:00:00Z',
  name: '김동국',
  phone: '01012345678',
  admission_year: '24',
  student_council_experience: true,
  student_council_details: '2025년 회계학과 학생회장',
  student_council_fee_status: 'paid',
  attendance_status: 'attending',
  privacy_consent_at: '2026-10-07T00:00:00Z',
  selection_criteria_consent_at: '2026-10-07T00:00:00Z',
  selection_status: 'selected',
  waitlist_order: null,
  participation_fee_status: 'unpaid',
  contacted_at: null,
  admin_memo: '',
  superseded_at: null,
};

describe('student attendance admin UI', () => {
  it('renders student responses in a separate panel', () => {
    const html = renderToStaticMarkup(
      <StudentAttendanceResponsesPanel
        responses={[response]}
        onUpdated={vi.fn()}
        onManagementUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onError={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('학생 참석 신청');
    expect(html).toContain('학생회 활동');
    expect(html).toContain('최신 회신순');
    expect(html).toContain('우선순위순');
    expect(html).toContain('<th class="admin-sequence-cell">순번</th>');
    expect(html).toContain('<td class="admin-sequence-cell">1</td>');
    expect(html).toContain('2025년 회계학과 학생회장');
    expect(html).toContain('김동국님의 학생 참석 응답 수정');
    expect(html).toContain('김동국님의 학생 선정 관리');
  });

  it('renders the selection-management fields separately from the response editor', () => {
    const html = renderToStaticMarkup(
      <StudentSelectionManagementDialog
        response={response}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onError={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('학생 선정 관리');
    expect(html).toContain('학생회비 납부 상태');
    expect(html).toContain('행사 참가비 30,000원');
    expect(html).toContain('개별 연락 완료');
  });

  it('renders the student-specific edit dialog fields', () => {
    const html = renderToStaticMarkup(
      <StudentAttendanceEditDialog
        response={response}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onError={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('학생 참석 응답 수정');
    expect(html).toContain('value="yes" selected=""');
    expect(html).toContain('2025년 회계학과 학생회장');
  });

  it('renders a separate deletion confirmation', () => {
    const html = renderToStaticMarkup(
      <StudentAttendanceDeleteDialog
        response={response}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onError={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('aria-describedby="student-attendance-delete-description"');
    expect(html).toContain('학생 참석 응답 삭제');
    expect(html).toContain('이 작업은 되돌릴 수 없습니다.');
  });
});
