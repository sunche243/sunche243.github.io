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

export async function shareInvitation(toast: (message: string) => void): Promise<void> {
  const shareData = {
    title: '동국대학교 회계학과 50주년 기념 회계인의 밤',
    text: '2026.11.13 FRI · 서울신라호텔 영빈관',
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
