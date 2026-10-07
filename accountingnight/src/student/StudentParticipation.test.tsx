import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StudentParticipation } from './StudentParticipation';

describe('student invitation attendance CTA', () => {
  it('links the student invitation to the isolated student attendance form', () => {
    const html = renderToStaticMarkup(<StudentParticipation />);

    expect(html).toContain('새로운 50년을 함께 만들어주세요');
    expect(html).toContain('재학생 참석 여부 회신하기');
    expect(html).toContain('href="/accountingnight/student/attendance/"');
    expect(html).not.toContain('/accountingnight/attendance/');
    expect(html).not.toContain('/accountingnight/sponsor/');
  });
});
