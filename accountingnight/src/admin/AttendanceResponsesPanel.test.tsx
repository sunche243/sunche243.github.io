import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AttendanceResponse } from '../types/attendance';
import { AttendanceDeleteDialog, AttendanceEditDialog } from './AttendanceResponsesPanel';

const response: AttendanceResponse = {
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  name: '박찬준',
  phone: '01012345678',
  admission_year: '08',
  affiliation: '동국대학교 교수',
  attendance_status: 'attending',
  privacy_consent_at: '2026-10-01T00:00:00Z',
};

describe('attendance response mutation dialogs', () => {
  it('renders an accessible edit dialog with the existing editable values', () => {
    const html = renderToStaticMarkup(
      <AttendanceEditDialog
        response={response}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onError={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('value="박찬준"');
    expect(html).toContain('value="01012345678"');
    expect(html).toContain('value="08"');
    expect(html).toContain('동국대학교 교수');
    expect(html).toContain('value="attending" selected=""');
    expect(html).toContain('변경사항 저장');
  });

  it('renders a separate confirmation dialog before deletion', () => {
    const html = renderToStaticMarkup(
      <AttendanceDeleteDialog
        response={response}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onError={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('aria-describedby="attendance-delete-description"');
    expect(html).toContain('박찬준');
    expect(html).toContain('참석');
    expect(html).toContain('이 작업은 되돌릴 수 없습니다.');
    expect(html).toContain('data-autofocus="true"');
  });
});
