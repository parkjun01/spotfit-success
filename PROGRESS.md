# SpotFit 작업 진행 기록
> 이 파일은 Claude와의 대화 중 자동으로 업데이트됩니다.
> 컨텍스트가 초기화되어도 여기서 상태를 이어갈 수 있습니다.

---

## 프로젝트 기본 정보
- **앱**: 위치 기반 스포츠 파티 매칭 플랫폼
- **Vercel URL**: https://spotfit-success.vercel.app
- **GitHub**: parkjun01/spotfit-success (branch: main)
- **로컬 경로**: `C:\Users\LG\Desktop\스팟핏 프레임짜\spotfit-web`
- **배포 규칙**: 유저가 "배포해줘"라고 명시적으로 말할 때만 `git push`

---

## 기술 스택
| 구분 | 기술 |
|---|---|
| 프론트 | Next.js 14 App Router + TypeScript + Tailwind CSS |
| DB | Supabase PostgreSQL + PostGIS |
| 실시간 | Supabase Realtime (채팅) |
| 인증 | Custom JWT (`lib/auth.ts`) |
| 지도 | Kakao Maps JS SDK |
| 결제 | TossPayments |
| 배포 | Vercel (root: `spotfit-web`) |

---

## Kakao Maps 설정
- **JS 키**: `405d8f53f98c26fe032e16aef77ee8d7`
- **Vercel 환경변수**: `NEXT_PUBLIC_KAKAO_JS_KEY` (코드에 하드코딩 폴백도 있음)
- **카카오 개발자 콘솔**: 플랫폼 → JavaScript 키 → 도메인에 `https://spotfit-success.vercel.app` 등록 완료
- **현재 상태**: ❌ 지도 미표시 (원인 조사 중)

---

## Supabase 설정
- `spots` 테이블에 `min_age`, `max_age` 컬럼 추가 필요:
  ```sql
  ALTER TABLE spots ADD COLUMN IF NOT EXISTS min_age INTEGER DEFAULT NULL;
  ALTER TABLE spots ADD COLUMN IF NOT EXISTS max_age INTEGER DEFAULT NULL;
  ```
- RLS 정책 추가 완료:
  ```sql
  CREATE POLICY "users_select" ON users FOR SELECT USING (true);
  CREATE POLICY "participations_select" ON participations FOR SELECT USING (true);
  ```
- `chat_messages`, `spots` 테이블 Realtime 활성화 필요 (supabase_realtime publication)

---

## 완료된 작업 목록

### Phase 0 — 기초 설정
- [x] PRD.md 생성
- [x] Task.md 생성 (11 Phase, 70개 태스크)

### Phase 1 — Vercel + Supabase 마이그레이션
- [x] Next.js 14 App Router로 전환
- [x] Supabase 연동 (DB + Realtime)
- [x] GitHub Actions CI/CD 설정
- [x] 환경변수 설정 (JWT, 암호화 키, Supabase 키)

### Phase 2 — API 구현
- [x] `/api/auth/*` (로그인, 토큰 갱신, 회원탈퇴, FCM 토큰)
- [x] `/api/spots/*` (CRUD + 참여/취소)
- [x] `/api/evaluations/*` (평가 제출 + 대기 조회)
- [x] `/api/rankings/*` (주간/월간 + 내 랭킹)
- [x] `/api/users/*` (프로필 + 내 스팟 + 통계)
- [x] `/api/payments/*` (결제 확인 + 취소 + 상태)
- [x] `/api/geocode`, `/api/reverse-geocode` (카카오 주소 API)
- [x] `/api/reports` (신고)
- [x] `/api/sports`, `/api/tags` (종목/태그 목록)

### Phase 3 — 페이지 구현
- [x] 홈 (지도 뷰 + 목록 뷰)
- [x] 로그인/회원가입
- [x] 스팟 상세 (`/spots/[id]`)
- [x] 스팟 생성 (`/spots/new`) + 빨간 테두리 유효성 검사
- [x] 채팅 (`/spots/[id]/chat`) — Supabase Realtime
- [x] 평가 (`/spots/[id]/evaluate`)
- [x] 랭킹 (`/ranking`)
- [x] 마이페이지 (`/mypage`)
- [x] 프로필 수정 (`/mypage/edit`)
- [x] 알림 설정 (`/mypage/notifications`)
- [x] 내 스팟 이력 (`/mypage/spots`)
- [x] 프리미엄 구독 (`/mypage/premium`) — Tinder/Strava/Discord 벤치마킹
- [x] 혜택 페이지 (`/benefits`)

### Phase 4 — 버그 수정
- [x] `lib/auth.ts` JWT 타입 오류 수정
- [x] `@types/crypto-js` 추가
- [x] Hydration mismatch (`localStorage` → `useEffect`로 이동)
- [x] `undefined.length` 에러 (`sport_name` null 체크)
- [x] 스팟 생성 DB 오류 (INSERT/UPDATE 분리, 예외 처리)
- [x] 로딩 스피너 `@keyframes spin` 추가
- [x] 랭킹 스포츠 필터 (하드코딩 → DB UUID)
- [x] `DYNAMIC_SERVER_USAGE` 경고 → `force-dynamic` 추가
- [x] `manifest.json` + `favicon.ico` 추가
- [x] `logo.png` 추가

### Phase 5 — 다크 테마 적용
- [x] 모든 페이지 다크 테마로 통일 완료
- [x] 지도 컴포넌트 스타일 정비

---

## 현재 진행 중 / 미해결 이슈

### 🔴 긴급: 카카오 지도 미표시
- **증상**: 지도뷰로 들어가도 지도가 보이지 않음
- **시도한 것들**: layout.tsx Script 태그 → 컴포넌트 내 직접 주입 → 폴링 방식
- **현재 코드 위치**: `spotfit-web/components/SpotMap.tsx`
- **다음 작업**: 오류 코드 화면 표시 + 근본 원인 분석

### 🟡 선택: Supabase SQL 실행 확인
- `min_age`, `max_age` 컬럼 추가 여부 미확인

---

## 환경변수 목록 (Vercel에 설정 필요)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
ENCRYPTION_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=405d8f53f98c26fe032e16aef77ee8d7
KAKAO_REST_API_KEY=
NEXT_PUBLIC_TOSS_CLIENT_KEY=      (선택)
TOSS_SECRET_KEY=                   (선택)
FIREBASE_PROJECT_ID=               (선택)
FIREBASE_PRIVATE_KEY=              (선택)
FIREBASE_CLIENT_EMAIL=             (선택)
```

---

## 최근 커밋 히스토리 (주요)
| 커밋 | 내용 |
|---|---|
| 5967c92 | fix: rewrite SpotMap/RouteMap - simplest possible Kakao Maps init |
| 8f2c911 | fix: self-loading Kakao Maps SDK in components |
| 558b5db | fix: hardcode Kakao Maps key fallback to fix map not loading in prod |
| 8b78909 | fix: resolve all Vercel build warnings |
| 536f30e | fix: add logo.png to public folder + fix manifest icon |
