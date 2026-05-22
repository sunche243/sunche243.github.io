# PROJECT OVERVIEW

이 프로젝트는 Firebase 기반의 QR 주문 시스템이다.

목표:
- 실제 행사/야간부스에서 안정적으로 운영 가능한 수준
- 추후 타 학과/업체에 판매 또는 대여 가능한 수준
- 기존 기능을 절대 깨뜨리지 않으면서 점진적으로 발전

---

# LANGUAGE

- 모든 응답은 반드시 한국어로 한다.
- 분석, 설명, 수정 계획, QA 내용도 한국어로 작성한다.
- 코드 주석은 요청받은 경우에만 추가한다.
- 불필요한 설명은 줄이고 핵심 위주로 설명한다.

---

# CRITICAL RULES (매우 중요)

## 1. 기존 기능 절대 삭제 금지

기존 기능을 제거하거나 무력화하지 마라.

기능 추가 시:
- 기존 기능 유지
- 기존 데이터 구조 유지
- 기존 Firebase 구조 유지
- 기존 UI/UX 유지

새 기능은 반드시 기존 기능과 호환되어야 한다.

---

## 2. 임의 리팩토링 금지

사용자가 명시적으로 요청하지 않는 이상:

- 전체 리팩토링 금지
- 구조 재설계 금지
- 파일 이동 금지
- 함수명 변경 금지
- CSS 구조 변경 금지

"더 좋아보여서" 변경 금지.

---

## 3. UI/디자인 보존

기존 디자인을 절대 임의 변경하지 마라.

특히:

- 버튼 디자인
- 카드 UI
- 그리드
- 모바일 UI
- 가운데 정렬
- spacing
- responsive layout

디자인 수정은 요청받은 경우만.

---

## 4. 전체 코드 기준 수정

항상 전체 프로젝트를 고려하라.

수정 전:

반드시 관련 파일을 먼저 읽고
영향 범위를 분석하라.

예시:

thankyou.js 수정 시:
- thankyou.html
- check.js
- menu.js
- utils.js
- common.js
- Firestore 구조

까지 영향 여부 검토.

---

## 5. 먼저 계획 → 그 다음 수정

절대 바로 수정하지 마라.

반드시 아래 순서를 따른다:

1. 관련 파일 탐색
2. 영향 받는 파일 목록 설명
3. 수정 계획 설명
4. 사용자 의도 검증
5. 수정 진행

사용자가 명확히 "바로 수정" 요청한 경우에만 생략 가능.

---

## 6. 수정 단위

항상:

"필요한 파일만 수정"

불필요한 파일 건드리지 마라.

---

## 7. 전체 파일 기준 제공

부분 코드(snippet) 금지.

수정 시:

항상
"복사 붙여넣기 가능한 전체 파일"

기준으로 작성.

절대 일부 함수만 보여주지 마라.

---

## 8. 정크코드 금지

절대:

- 중복 함수
- 안 쓰는 변수
- 안 쓰는 id/class
- 죽은 코드(dead code)
- 중복 CSS
- 미사용 import

추가 금지.

기존 코드 분석 시:
정크코드 후보도 함께 보고하라.

---

## 9. 콘솔 에러 방지

수정 후 반드시 검토:

- import 에러
- null element 접근
- DOM id mismatch
- undefined
- Firebase permission issue
- async race condition

---

## 10. Firebase 구조 유지

이미 Firebase 연동 완료된 프로젝트다.

현재 사용:

- Firestore
- Storage
- Authentication

기존 구조를 유지한다.

절대 임의로:
- collection 이름 변경
- document 구조 변경
- field rename
- auth 방식 변경

하지 마라.

기존 데이터와 backward compatibility 유지.

---

# CURRENT ARCHITECTURE

## CUSTOMER FLOW

menu.html
↓
check.html
↓
thankyou.html

주문 플로우를 절대 깨뜨리지 마라.

---

## ADMIN FLOW

admin.html
serve.html
stats.html
menuManager.html

각 페이지 역할 유지.

---

# PAGE RESPONSIBILITIES

## menu.html
고객 주문 페이지

기능:
- 메뉴 선택
- 수량 선택
- 입금자명 입력
- 테이블번호 처리
- 메뉴판 모달
- 예상금액 계산
- 주문 데이터 생성

관련 JS:
js/menu.js

---

## check.html
주문 최종 확인 페이지

기능:
- 주문 검토
- 총액 표시
- Firestore 저장 전 검증
- 주문 확정

관련 JS:
js/check.js

---

## thankyou.html
주문 완료 페이지

기능:
- 주문 요약
- 계좌 표시
- 계좌 복사
- 토스 송금 버튼
- 총 금액 표시

관련 JS:
js/thankyou.js

---

## admin.html
관리자 주문 관리

기능:
- 주문 확인
- 확인 취소
- 삭제
- 복구
- 필터링
- 검색
- 요약 카드

관련 JS:
js/admin.js

---

## serve.html
서빙 관리

기능:
- 확인된 주문만 표시
- 서빙 예정
- 서빙 완료
- 담당자 저장
- 항목 단위 분리

관련 JS:
js/serve.js

---

## stats.html
통계

기능:
- 총매출
- 메뉴별 판매량
- 시간대별 주문
- 서빙 시간 통계

관련 JS:
js/stats.js

---

## menuManager.html
메뉴/결제 관리

기능:
- 관리자 로그인
- 메뉴 CRUD
- 매진 처리
- 메뉴 표시 여부
- 메뉴판 이미지 업로드
- 계좌정보 설정
- 토스 연동 정보 설정

관련 JS:
js/menuManager.js

---

# FILE RULES

## css/style.css

모든 스타일은 여기서 관리.

규칙:

- CSS 중복 금지
- 미사용 class/id 제거 가능
- 단 기존 기능 확인 후 제거
- 디자인 임의 변경 금지

---

## js/common.js

Firebase 초기화.

절대 깨뜨리지 마라.

---

## js/utils.js

공용 함수.

중복 함수 생성 전에
utils.js 사용 가능성 검토.

---

# CODING STYLE

- Vanilla JavaScript only
- HTML/CSS/JS 분리
- 모듈 import 유지
- Firebase v11.7.1 유지
- 기존 naming convention 유지

---

# BEFORE MODIFYING

반드시 먼저:

1. 관련 파일 읽기
2. 영향 범위 설명
3. 수정 계획 설명

그 후 수정.

---

# AFTER MODIFYING

반드시 보고:

## 수정된 파일
예:
- thankyou.html
- js/thankyou.js

## 변경 내용
무엇을 왜 수정했는지

## 영향 범위
다른 페이지 영향 여부

## QA CHECKLIST

- menu.html 정상 여부
- check.html 정상 여부
- thankyou.html 정상 여부
- admin.html 정상 여부
- serve.html 정상 여부
- stats.html 정상 여부
- menuManager.html 정상 여부

- broken import 없음
- console error 없음
- id/class mismatch 없음

---

# GIT SAFETY

대규모 수정 전:

항상 git rollback 가능성을 고려하라.

위험한 변경 시:
반드시 위험성을 먼저 설명하라.

---

# DO NOT

절대 하지 마라:

- 전체 프로젝트 리팩토링
- UI 전면 변경
- 기존 기능 제거
- Firebase 구조 변경
- CSS 재작성
- 이름 변경
- 파일 이동
- 코드 스타일 통일 강요

안정성 우선.

---

# DEFAULT BEHAVIOR

사용자가 기능 추가 요청 시:

1. 관련 파일 분석
2. 영향 범위 설명
3. 수정 계획 설명
4. 승인 후 수정

항상 보수적으로 행동한다.

---

# 주문 데이터 전달 정책 (매우 중요)

## URL 정책

보안 및 URL 안정성을 위해:

URL query parameter에는 `table`만 허용한다.

허용:

menu.html?table=7

금지:

- sessionId
- items
- payer name
- total amount
- order object
- 기타 주문 관련 데이터

주문 데이터는 URL로 전달하지 않는다.

---

## sessionStorage 정책

주문 흐름 데이터는 sessionStorage를 사용한다.

### pendingOrder

용도:

menu.html → check.html

저장 정보:

- table
- sessionId
- payer name
- items

check.html은 URL 파라미터가 아니라
sessionStorage.pendingOrder를 읽어 렌더링한다.

---

### completedOrder

용도:

check.html → thankyou.html

저장 정보:

- 주문 완료 화면 표시용 데이터

thankyou.html은 URL 파라미터가 아니라
sessionStorage.completedOrder를 읽어 렌더링한다.

---

## 신뢰 모델(Security)

sessionStorage는 조작 가능하므로 신뢰하지 않는다.

최종 신뢰는 반드시 Firestore transaction 검증으로 유지한다.

절대 제거 금지:

- order.js sessionId 재검증 로직
- Firestore transaction 검증
- table session 검증

프론트 데이터는 편의용이며,
최종 데이터 검증은 서버(Firebase) 기준이다.

---

# 관리자 페이지 정책

관리자/운영진 페이지는
일반 고객 대상 UI가 아니다.

따라서:

불필요한 설명 문구 노출을 최소화한다.

예:

- “1인당 10,000원” 같은 운영자가 이미 아는 설명
- 중복 안내 문구
- 과도한 UX helper text

운영 효율 중심 UI를 우선한다.

단,
실수 방지에 필요한 정보는 유지 가능하다.

---

## 설정값 관리 원칙

자주 변경 가능한 운영값은
하드코딩하지 않는다.

예:

- 자릿세
- 계좌정보
- 토스 정보
- 운영 설정값

가능한 경우:

menuManager.html 등 관리자 페이지에서 수정 가능하도록 구현한다.

단,
기존 Firebase 구조와 backward compatibility를 유지해야 한다.

---

# AGENTS.md 수정 정책

새로운 요청이 들어왔을 때:

다음 조건을 만족하면
AGENTS.md 추가 후보로 간주한다.

1. 앞으로 반복 적용될 규칙
2. 프로젝트 전체에 영향을 주는 정책
3. 여러 기능에서 공통으로 사용되는 구조
4. 보안/데이터 흐름 관련 규칙
5. 기존 기능 안정성과 직접 관련된 규칙

이 경우:

수정 전에

“이건 AGENTS.md에 추가하는 게 좋아 보입니다”

라고 먼저 제안한다.

일회성 기능 변경은
AGENTS.md에 추가하지 않는다.