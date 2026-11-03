import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sponsorship } from './Sponsorship';

describe('invitation sponsorship CTA', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T23:59:59+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the primary sponsor CTA and provides audience-specific routes', () => {
    const html = renderToStaticMarkup(<Sponsorship />);

    expect(html).toContain('참석 및 후원 확약하기');
    expect(html).toContain('href="/accountingnight/sponsor/#registration"');
    expect(html).not.toContain('후원 없이 참석 여부만 회신하기');
    expect(html).not.toContain('href="/accountingnight/attendance/"');
    expect(html).toContain('재학생 전용 초대장 보기');
    expect(html).toContain('href="/accountingnight/student/"');
  });

  it('changes the primary CTA to sponsorship-only wording after midnight', () => {
    vi.setSystemTime(new Date('2026-11-04T00:00:00+09:00'));
    const html = renderToStaticMarkup(<Sponsorship />);

    expect(html).toContain('발전기금 후원 약정하기');
    expect(html).not.toContain('참석 및 후원 확약하기');
  });
});
