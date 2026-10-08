import { describe, expect, it } from 'vitest';
import { getInvitationShareContent } from './share';

describe('invitation share content', () => {
  it('includes the complete venue in general invitation shares', () => {
    const content = getInvitationShareContent();

    expect(content.title).toBe('동국대학교 회계학과 50주년 기념 회계인의 밤');
    expect(content.text).toContain('서울신라호텔 영빈관 · 루비홀');
  });

  it('labels student invitation shares explicitly', () => {
    const content = getInvitationShareContent('student');

    expect(content.title).toContain('[재학생 초대장]');
    expect(content.text).toContain('재학생 여러분을 초대합니다');
    expect(content.text).toContain('서울신라호텔 영빈관 · 루비홀');
    expect(content.buttonTitle).toBe('재학생 초대장 보기');
  });
});
