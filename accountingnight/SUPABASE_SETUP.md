# Supabase 설정 가이드

이 문서는 `/accountingnight/sponsor/`의 후원·참석 등록과 `/accountingnight/admin/` 관리자 페이지를 활성화하는 절차입니다.

## 1. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트를 만듭니다.
2. 리전과 데이터베이스 비밀번호를 안전하게 보관합니다.
3. 데이터베이스 비밀번호는 이 저장소나 프론트엔드 환경변수에 넣지 않습니다.

## 2. Project URL과 anon key 확인

Supabase Dashboard의 **Project Settings → API**에서 다음 값을 확인합니다.

- Project URL → `VITE_SUPABASE_URL`
- Publishable key 또는 anon public key → `VITE_SUPABASE_ANON_KEY`

`service_role` key는 RLS를 우회합니다. 절대로 `VITE_` 환경변수, 소스 코드, GitHub Pages 또는 브라우저에 넣지 마세요.

## 3. 로컬 환경변수 작성

`accountingnight/.env.local`을 만들고 아래 값을 입력합니다. 이 파일은 `.gitignore`에 포함되어 있습니다.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_KAKAO_JAVASCRIPT_KEY=YOUR_KAKAO_KEY
```

## 4. 데이터베이스 생성

1. Supabase Dashboard의 **SQL Editor**를 엽니다.
2. [`supabase/schema.sql`](./supabase/schema.sql) 전체를 붙여 넣습니다.
3. **Run**을 눌러 `admins`, `form_fields`, `submissions`, RLS policy와 RPC를 생성합니다.

일반 방문자는 활성 폼 항목만 읽을 수 있고, 신청은 제한된 `submit_sponsorship()` RPC로만 등록합니다. 다른 신청자의 이름이나 전화번호를 조회할 권한은 없습니다.

## 5. 관리자 계정 생성

1. **Authentication → Users → Add user**에서 이메일/비밀번호 관리자를 직접 만듭니다.
2. 생성된 사용자의 UUID를 복사합니다.
3. SQL Editor에서 아래 SQL의 UUID를 교체해 실행합니다.

```sql
insert into public.admins (user_id)
values ('관리자-사용자-UUID');
```

관리자 회원가입 화면은 사이트에 제공되지 않습니다. Auth 사용자이더라도 `admins`에 등록되지 않으면 관리자 데이터에 접근할 수 없습니다.

## 6. 개인정보 정책 확인

배포 전에 [`src/config/privacy.ts`](./src/config/privacy.ts)의 보유 기간을 실제 운영 정책으로 반드시 교체하고, 수집 목적과 수집 항목도 운영 담당자에게 확인받아야 합니다.

## 7. 로컬 실행

```bash
npm install
npm run dev
```

확인 URL:

- 초대장: `http://localhost:5173/accountingnight/`
- 후원·참석 등록: `http://localhost:5173/accountingnight/sponsor/`
- 관리자: `http://localhost:5173/accountingnight/admin/`

등록 후 관리자 페이지에서 신청 데이터가 보이는지, 상태·메모 저장과 Excel 다운로드가 동작하는지 확인합니다.

## 8. GitHub Actions Variables 등록

GitHub 저장소의 **Settings → Secrets and variables → Actions → Variables**에서 다음 Repository variable을 추가합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

이 값들은 공개 클라이언트용 값이며 RLS가 적용되어야 합니다. `service_role`, 데이터베이스 비밀번호, 관리자 비밀번호는 등록하지 않습니다.

## 9. Production 테스트

배포 후 다음을 확인합니다.

1. `/accountingnight/`, `/accountingnight/sponsor/`, `/accountingnight/admin/` 직접 접속과 새로고침
2. 후원만, 참석만, 후원+참석, 후원+참석 미정 제출
3. 개인정보 동의 없이 제출 차단
4. 관리자 미등록 Auth 계정의 접근 차단
5. 상태·메모 저장, 신청 삭제 confirmation
6. 동적 항목 추가·수정·비활성화·재활성화와 기존 답변 보존
7. 한글 `.xlsx` 다운로드 및 예상 후원금 숫자 열 확인

## 배포 전 필수 TODO

- 개인정보 보유 기간과 안내 문구를 실제 정책으로 확정
- 행사 운영자가 관리자 계정과 `admins` 등록을 확인
- Supabase RLS와 공개 RPC를 실제 anon/authenticated 계정으로 검증
- 연락 담당자와 후원 후속 연락 절차를 확정
- 테스트 신청을 삭제하고 production 제출을 최종 점검
