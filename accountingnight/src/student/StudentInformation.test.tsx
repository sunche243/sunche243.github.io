import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StudentContactShare } from './StudentContactShare';
import { StudentProgram } from './StudentProgram';

describe('student invitation information', () => {
  it('uses the student-only contact details', () => {
    const markup = renderToStaticMarkup(<StudentContactShare />);

    expect(markup).toContain('010-9678-4100');
    expect(markup).toContain('starcj7@naver.com');
  });

  it('uses the student-only contact without sharing controls on the attendance page', () => {
    const markup = renderToStaticMarkup(<StudentContactShare showShare={false} />);

    expect(markup).toContain('010-9678-4100');
    expect(markup).toContain('starcj7@naver.com');
    expect(markup).not.toContain('SHARE INVITATION');
  });

  it('keeps the student invitation entry path deployable on Linux', () => {
    const html = readFileSync(new URL('../../student/index.html', import.meta.url), 'utf8');

    expect(html).toContain('src="../src/student-main.tsx"');
  });

  it('shows the complete student event program', () => {
    const markup = renderToStaticMarkup(<StudentProgram />);

    expect(markup).toContain('17:00');
    expect(markup).toContain('입장 시작');
    expect(markup).toContain('18:00');
    expect(markup).toContain('환영사');
    expect(markup).toContain('18:30');
    expect(markup).toContain('축사');
    expect(markup).toContain('19:00-19:55');
    expect(markup).toContain('식사');
    expect(markup).toContain('19:55-20:20');
    expect(markup).toContain('ACCORD 공연');
    expect(markup).toContain('20:20');
    expect(markup).toContain('2부 시작 및 레크레이션');
    expect(markup).toContain('20:40');
    expect(markup).toContain('럭키드로우');
    expect(markup).toContain('21:00');
    expect(markup).toContain('폐회식');
  });
});
