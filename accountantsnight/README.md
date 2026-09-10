# 회계인의 밤 모바일 디지털 초대장

동국대학교 회계학과 50주년 기념 `회계인의 밤` 웹사이트입니다. GitHub Pages에서 `/accountantsnight/` 경로로 배포됩니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

## 행사 데이터

- 기본 행사 정보: `src/data/event.ts`
- 연혁: `src/data/history.ts`
- 행사 식순: `src/data/program.ts`
- 교통 안내: `src/data/transport.ts`
- 문의처: `src/data/contacts.ts`

## Firebase

`.env`에 다음 값을 설정하면 Firebase Storage와 Anonymous Authentication을 사용하는 사진 업로드가 활성화됩니다.

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=
```

Storage rules 예시는 `firebase/storage.rules`에 있습니다.

## Kakao JavaScript Key

`.env`에 `VITE_KAKAO_JAVASCRIPT_KEY`를 설정합니다. 값이 없으면 Web Share 또는 URL 복사로 대체됩니다.

## BGM과 이미지

- BGM: `public/audio/bgm.mp3`
- Hero 이미지: `public/images/hero.webp`
- 공유 이미지: `public/images/og-image.jpg`
- favicon: `public/favicon.svg`

Hero 이미지가 없어도 기본 배경으로 렌더링됩니다.
