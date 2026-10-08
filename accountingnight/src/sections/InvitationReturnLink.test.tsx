import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InvitationReturnLink } from './InvitationReturnLink';

describe('invitation return link', () => {
  it('returns to the main accounting night invitation by default', () => {
    const html = renderToStaticMarkup(<InvitationReturnLink />);

    expect(html).toContain('초대장으로 돌아가기');
    expect(html).toContain('href="/accountingnight/"');
  });
});
