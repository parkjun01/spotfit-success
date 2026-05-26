# SpotFit 배포 가이드 (Vercel + Supabase + GitHub)

## 1단계. Supabase 프로젝트 설정

1. [https://app.supabase.com](https://app.supabase.com) 접속 → 새 프로젝트 생성
2. **SQL Editor** → `spotfit-web/supabase/migrations/20240101000000_initial.sql` 전체 붙여넣기 후 실행
3. **Settings → API**에서 다음 값 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`
4. **Database → Replication** → `chat_messages`, `spots` 테이블 Realtime 활성화 확인

---

## 2단계. GitHub 리포지토리 생성

```bash
cd "C:\Users\LG\Desktop\스팟핏 프레임짜"
git init
git add .
git commit -m "feat: initial SpotFit project setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/spotfit.git
git push -u origin main
```

---

## 3단계. Vercel 프로젝트 설정

1. [https://vercel.com](https://vercel.com) → **Add New Project** → GitHub 리포 선택
2. **Root Directory** → `spotfit-web` 로 변경
3. **Environment Variables** 추가 (`spotfit-web/.env.local.example` 참고):

| 변수명 | 값 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `JWT_SECRET` | 랜덤 32자 이상 문자열 |
|` | 32자 암호화 키 |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 네이버 클라우드 콘솔 Client ID |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 토스페이먼츠 Client Key |
| `TOSS_SECRET_KEY` | 토스페이먼츠 Secret Key |
| `FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `FIREBASE_PRIVATE_KEY` | Firebase 서비스 계정 Private Key |
| `FIREBASE_CLIENT_EMAIL` | Firebase 서비스 계정 Email |

4. **Deploy** 클릭

---

## 4단계. GitHub Actions Secrets 설정

GitHub 리포 → **Settings → Secrets and variables → Actions**:

| Secret 이름 | 값 |
|------------|-----|
| `VERCEL_TOKEN` | Vercel 대시보드 → Settings → Tokens에서 발급 |
| `VERCEL_ORG_ID` | Vercel 프로젝트 설정 → `.vercel/project.json`의 `orgId` |
| `VERCEL_PROJECT_ID` | Vercel 프로젝트 설정 → `.vercel/project.json`의 `projectId` |

> Vercel 프로젝트 ID 확인: `spotfit-web` 디렉토리에서 `vercel link` 실행 후 `.vercel/project.json` 확인

---

## 5단계. 네이버 클라우드 Maps API 설정

1. [https://console.ncloud.com](https://console.ncloud.com) → **AI·NAVER API → Application 등록**
2. **Maps - Web Dynamic Map** 선택
3. **서비스 URL**에 Vercel 도메인 추가 (예: `https://spotfit.vercel.app`)
4. Client ID를 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 설정

---

## 배포 플로우

```
코드 수정
    ↓
git push origin main
    ↓
GitHub Actions 실행 (타입 체크)
    ↓
Vercel 자동 빌드 & 배포
    ↓
https://spotfit.vercel.app 에서 확인
```

**PR 생성 시**: 프리뷰 URL 자동 생성 → PR 코멘트에 링크 추가

---

## 아키텍처 다이어그램

```
모바일 앱 (React Native)
         ↓  HTTPS API 호출
웹 앱 (Next.js) ──── Vercel 서버리스 (서울 리전 icn1)
         ↓
Supabase (PostgreSQL + Realtime)
    - 스팟, 사용자, 채팅 데이터
    - Realtime: 채팅 메시지 실시간 구독
    - Storage: 프로필 이미지
```
