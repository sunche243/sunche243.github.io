import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RegistrationForm } from './RegistrationForm';

describe('sponsor registration form', () => {
  it('renders the donation tax benefit notice', () => {
    const html = renderToStaticMarkup(<RegistrationForm onComplete={vi.fn()} />);

    expect(html).toContain('세제 혜택 안내');
    expect(html).toContain("동국대학교 &#x27;기부금&#x27;으로 투명하게 처리됩니다.");
    expect(html).toContain('법정 한도 내 전액 손금산입(법인)');
    expect(html).toContain('기부금 세액공제(개인)');
    expect(html).toContain('회계학과 후배들의 든든한 버팀목');
  });
});
