import { event } from '../data/event';

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share?: {
        sendDefault: (options: unknown) => void;
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function isKakaoConfigured(): boolean {
  return Boolean(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY);
}

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kakao SDK를 불러오지 못했습니다.'));
    document.head.append(script);
  });

  return scriptPromise;
}

export async function shareToKakao(): Promise<void> {
  const key = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;
  if (!key) throw new Error('Kakao JavaScript Key가 설정되어 있지 않습니다.');

  await loadKakaoSdk();
  if (!window.Kakao) throw new Error('Kakao SDK를 사용할 수 없습니다.');
  if (!window.Kakao.isInitialized()) window.Kakao.init(key);

  window.Kakao.Share?.sendDefault({
    objectType: 'feed',
    content: {
      title: '동국대학교 회계학과 50주년 기념 회계인의 밤',
      description: '2026.11.13 FRI · 서울신라호텔 영빈관',
      imageUrl: new URL(event.ogImage, window.location.origin).toString(),
      link: {
        mobileWebUrl: window.location.href,
        webUrl: window.location.href,
      },
    },
    buttons: [
      {
        title: '초대장 보기',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
    ],
  });
}
