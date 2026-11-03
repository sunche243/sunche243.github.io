import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SponsorshipIntro } from './SponsorshipIntro';

describe('sponsorship-only intro', () => {
  it('explains that attendance is closed and sponsorship remains available through November 15', () => {
    const html = renderToStaticMarkup(<SponsorshipIntro sponsorshipOnly />);

    expect(html).toContain('참가 신청 기간이 종료되었습니다.');
    expect(html).toContain('발전기금 후원 약정만 가능');
    expect(html).toContain('2026년 11월 15일(일)까지');
    expect(html).not.toContain('참석 여부 파악');
  });
});
