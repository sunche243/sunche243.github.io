import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StudentParticipation } from './StudentParticipation';

describe('student invitation attendance CTA', () => {
  it('links the student invitation to the isolated student attendance form', () => {
    const html = renderToStaticMarkup(<StudentParticipation />);

    expect(html).toContain('새로운 50년을 함께 만들어주세요');
    expect(html).toContain('재학생 참석 신청 및 불참 회신하기');
    expect(html).toContain('신청 후 선정되며 결과는 개별 안내');
    expect(html).toContain('1학년(26학번) 대상 행사가 아닙니다');
    expect(html).toContain('href="/accountingnight/student/attendance/#student-attendance-response"');
    expect(html).not.toContain('/accountingnight/attendance/');
    expect(html).not.toContain('/accountingnight/sponsor/');
  });
});
