import { event } from '../data/event';

export type InvitationShareVariant = 'general' | 'student';

export function getInvitationShareContent(variant: InvitationShareVariant = 'general') {
  const student = variant === 'student';

  return {
    title: student ? `[재학생 초대장] ${event.title}` : `동국대학교 ${event.title}`,
    text: student
      ? `재학생 여러분을 초대합니다 · ${event.shortDateLabel} · ${event.venue}`
      : `${event.shortDateLabel} · ${event.venue}`,
    buttonTitle: student ? '재학생 초대장 보기' : '초대장 보기',
  };
}

export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue with the legacy selection fallback when clipboard permission is denied.
    }
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  try {
    document.body.append(input);
    input.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    input.remove();
  }
}

export async function shareInvitation(
  toast: (message: string) => void,
  variant: InvitationShareVariant = 'general',
): Promise<void> {
  const content = getInvitationShareContent(variant);
  const shareData = {
    title: content.title,
    text: content.text,
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }

  const copied = await copyText(window.location.href);
  toast(copied ? '초대장 주소를 복사했습니다.' : '주소를 복사하지 못했습니다. 다시 시도해주세요.');
}
