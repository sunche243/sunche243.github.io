import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import {
  StudentAttendanceDeleteDialog,
  StudentAttendanceEditDialog,
  StudentAttendanceResponsesPanel,
} from './StudentAttendanceResponsesPanel';

const response: StudentAttendanceResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-10-07T00:00:00Z',
  name: '김동국',
  phone: '01012345678',
  admission_year: '24',
  student_council_experience: true,
  student_council_details: '2025년 회계학과 학생회장',
  attendance_status: 'attending',
  privacy_consent_at: '2026-10-07T00:00:00Z',
  selection_criteria_consent_at: '2026-10-07T00:00:00Z',
};

describe('student attendance admin UI', () => {
  it('renders student responses in a separate panel', () => {
    const html = renderToStaticMarkup(
      <StudentAttendanceResponsesPanel
        responses={[response]}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onError={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('학생 참석');
    expect(html).toContain('학생회 활동');
    expect(html).toContain('2025년 회계학과 학생회장');
    expect(html).toContain('김동국님의 학생 참석 응답 수정');
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
