import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistrationForm } from './RegistrationForm';

describe('sponsor registration form', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T23:59:59+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the 50th-anniversary option before the 100th-anniversary option', () => {
    const html = renderToStaticMarkup(<RegistrationForm sponsorshipOnly={false} onComplete={vi.fn()} />);

    expect(html).toContain('OPTION 1');
    expect(html).toContain('50주년 수호 구좌');
    expect(html).toContain('50만원 후원 + 행사참석');
    expect(html).toContain('OPTION 2');
    expect(html).toContain('100주년 발전구좌');
    expect(html).toContain('100만원 후원 + 행사 참석');
    expect(html.indexOf('50주년 수호 구좌')).toBeLessThan(html.indexOf('100주년 발전구좌'));
  });

  it('renders the donation tax benefit notice', () => {
    const html = renderToStaticMarkup(<RegistrationForm sponsorshipOnly={false} onComplete={vi.fn()} />);

    expect(html).toContain('세제 혜택 안내');
    expect(html).toContain("동국대학교 &#x27;기부금&#x27;으로 투명하게 처리됩니다.");
    expect(html).toContain('법정 한도 내 전액 손금산입(법인)');
    expect(html).toContain('기부금 세액공제(개인)');
    expect(html).toContain('회계학과 후배들의 든든한 버팀목');
  });

  it('renders only the sponsorship amount field after the cutoff', () => {
    const html = renderToStaticMarkup(<RegistrationForm sponsorshipOnly onComplete={vi.fn()} />);

    expect(html).toContain('발전기금 후원 약정');
    expect(html).toContain('후원 약정액');
    expect(html).toContain('원하시는 금액으로 자유롭게 후원하실 수 있습니다.');
    expect(html).not.toContain('50만원 후원 + 행사참석');
    expect(html).not.toContain('100만원 후원 + 행사 참석');
    expect(html).not.toContain('행사에는 아쉽게 불참');
    expect(html).not.toContain('이번 행사에는 참석하지 못하며');
    expect(html).not.toContain('참석 여부 및 발전기금 약정');
    expect(html).not.toContain('name="pledge-option"');
  });
});
