import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminDataForm } from './AdminDataForm';

describe('admin data form', () => {
  it('starts with sponsorship fields and marks every data field as optional', () => {
    const html = renderToStaticMarkup(<AdminDataForm onCreated={() => undefined} onError={() => undefined} />);

    expect(html).toContain('발전기금·참석 회신 입력');
    expect(html).toContain('현재 소속 및 직함');
    expect(html).toContain('후원금액');
    expect(html).toContain('참석 여부');
    expect(html).toContain('모두 선택 입력');
    expect(html).not.toContain('required=""');
  });
});
