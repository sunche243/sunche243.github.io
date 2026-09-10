export function createNaverMapUrl(query: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

export function createKakaoMapUrl(query: string): string {
  return `https://map.kakao.com/?q=${encodeURIComponent(query)}`;
}
