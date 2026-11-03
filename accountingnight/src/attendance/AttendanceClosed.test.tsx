import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AttendanceApp } from './AttendanceApp';

describe('closed general attendance page', () => {
  it('replaces the response form with a closed notice and sponsorship route', () => {
    const html = renderToStaticMarkup(<AttendanceApp />);

    expect(html).toContain('참석 회신이');
    expect(html).toContain('마감되었습니다');
    expect(html).toContain('참가 신청 기간이 종료');
    expect(html).toContain('2026년 11월 15일(일)까지');
    expect(html).toContain('href="/accountingnight/sponsor/#registration"');
    expect(html).not.toContain('id="attendance-name"');
    expect(html).not.toContain('name="attendance-status"');
  });
});
