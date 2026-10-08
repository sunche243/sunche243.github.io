import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Sponsorship } from './Sponsorship';

describe('invitation sponsorship CTA', () => {
  it('keeps the primary sponsor CTA and provides audience-specific routes', () => {
    const html = renderToStaticMarkup(<Sponsorship />);

    expect(html).toContain('참석 및 후원 확약하기');
    expect(html).toContain('href="/accountingnight/sponsor/#registration"');
    expect(html).toContain('후원 없이 참석 여부만 회신하기');
    expect(html).toContain('href="/accountingnight/attendance/"');
    expect(html).toContain('재학생 전용 초대장 보기');
    expect(html).toContain('href="/accountingnight/student/"');
  });
});
