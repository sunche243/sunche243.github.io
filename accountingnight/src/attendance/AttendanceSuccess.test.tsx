import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AttendanceForm } from './AttendanceForm';
import { AttendanceSuccess } from './AttendanceSuccess';

describe('attendance success UI', () => {
  it('shows the response form before submission', () => {
    const html = renderToStaticMarkup(<AttendanceForm />);

    expect(html).toContain('<form');
    expect(html).toContain('참석 여부 회신하기');
    expect(html).not.toContain('RSVP COMPLETE');
  });

  it('replaces the form with the completed attending response', () => {
    const html = renderToStaticMarkup(
      <AttendanceSuccess name="홍길동" status="attending" />,
    );

    expect(html).not.toContain('<form');
    expect(html).toContain('RSVP COMPLETE');
    expect(html).toContain('회신해 주셔서 감사합니다');
    expect(html).toContain('id="attendance-success-title"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('참석 여부가 정상적으로 전달되었습니다.');
    expect(html).toContain('참석합니다');
    expect(html).toContain('11월 13일');
    expect(html).toContain('회계인의 밤에서 뵙겠습니다.');
  });

  it('shows the not-attending completion message', () => {
    const html = renderToStaticMarkup(
      <AttendanceSuccess name="김동국" status="not_attending" />,
    );

    expect(html).not.toContain('<form');
    expect(html).toContain('참석하지 못합니다');
    expect(html).toContain('소중한 회신에 감사드립니다.');
    expect(html).toContain('다음 기회에 함께할 수 있기를 바랍니다.');
  });
});
