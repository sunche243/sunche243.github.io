export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  const ok = document.execCommand('copy');
  input.remove();
  return ok;
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
    } catch {
      // User cancellation falls back to copying the invitation URL.
    }
  }

  await copyText(window.location.href);
  toast('초대장 주소를 복사했습니다.');
}
