import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Sponsorship } from './Sponsorship';

describe('invitation sponsorship CTA', () => {
  it('links the combined attendance and sponsorship CTA to the sponsor form', () => {
    const html = renderToStaticMarkup(<Sponsorship />);

    expect(html).toContain('참석 및 후원 확약하기');
    expect(html).toContain('href="/accountingnight/sponsor/#registration"');
    expect(html).not.toContain('href="/accountingnight/attendance/"');
  });
});
