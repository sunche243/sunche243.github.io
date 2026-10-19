# Seating Studio

`https://sunche.me/table/`에 배포되는 독립 공개 좌석 배치 도구입니다.

## 로컬 실행

```bash
npm ci
npm run dev
```

## 데이터 보관

- 참석자 명단, 배치도, 좌석 배정은 외부 서버로 전송하지 않고 현재 브라우저의 `localStorage`에 자동 저장합니다.
- 다른 브라우저나 기기로 옮길 때는 화면 상단의 **JSON 백업**과 **백업 복원**을 사용합니다.
- 회계인의 밤 관리자 페이지는 선정자용 Excel을 내려받고, 같은 도메인의 `sessionStorage`를 통해 명단을 한 번 전달합니다.

## 배포

루트 GitHub Pages 워크플로가 `table` 프로젝트의 lint, test, build를 실행한 뒤 `dist`를 `/table/`에 배치합니다.
