import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StudentAttendanceClosed } from './StudentAttendanceClosed';

describe('student attendance closed screen', () => {
  it('thanks applicants and shows the exact closing time', () => {
    const html = renderToStaticMarkup(<StudentAttendanceClosed />);

    expect(html).toContain('APPLICATION CLOSED');
    expect(html).toContain('재학생 참석 신청이');
    expect(html).toContain('마감되었습니다');
    expect(html).toContain('보내주신 관심과 성원에 진심으로 감사드립니다.');
    expect(html).toContain('2026. 10. 20. 23:59:59');
    expect(html).toContain('재학생 초대장 다시 보기');
  });
});
