# SpotFit — 위치 기반 1회성 운동 파티 매칭 플랫폼

## 프로젝트 구조

```
스팟핏 프레임짜/
├── spotfit-backend/          # Node.js + Express API 서버
│   ├── src/
│   │   ├── app.js            # Express 앱 설정
│   │   ├── server.js         # HTTP + Socket.io 서버 진입점
│   │   ├── config/           # DB, Redis, Firebase 설정
│   │   ├── controllers/      # 라우트 핸들러
│   │   ├── middleware/        # 인증, 에러 핸들링
│   │   ├── services/         # 비즈니스 로직 (매너점수, 알림)
│   │   ├── socket/           # WebSocket 채팅 핸들러
│   │   └── jobs/             # Cron 스케줄러
│   └── migrations/           # PostgreSQL 초기 스키마
├── spotfit-mobile/           # React Native CLI 앱
│   └── src/
│       ├── api/              # Axios API 클라이언트
│       ├── navigation/       # React Navigation 설정
│       ├── screens/          # 화면 컴포넌트
│       ├── store/            # Redux Toolkit 상태관리
│       ├── hooks/            # 커스텀 훅 (useSocket, useLocation)
│       ├── components/       # 공통 컴포넌트
│       └── utils/            # 상수, 헬퍼
├── docker-compose.yml        # 로컬 개발 환경
├── PRD.md                    # 제품 요구사항 문서
└── Task.md                   # 개발 태스크 목록
```

## 빠른 시작

### 1. 환경 설정
```bash
cd spotfit-backend
cp .env.example .env
# .env 파일에 실제 값 입력
```

### 2. 로컬 DB + Redis 실행
```bash
docker-compose up postgres redis -d
```

### 3. 백엔드 실행
```bash
cd spotfit-backend
npm install
npm run dev
# http://localhost:3000
```

### 4. 모바일 앱 실행
```bash
cd spotfit-mobile
npm install
npx react-native run-android   # Android
npx react-native run-ios       # iOS
```

## 필수 API 키

| 서비스 | 용도 | 발급처 |
|--------|------|--------|
| 네이버맵 Client ID | 지도 렌더링 | [네이버 클라우드 콘솔](https://console.ncloud.com) |
| Firebase Admin SDK | FCM 푸시 알림 | [Firebase 콘솔](https://console.firebase.google.com) |
| 토스페이먼츠 | 구독 결제 | [토스페이먼츠 개발자센터](https://developers.tosspayments.com) |
| PASS 인증 | 본인인증 | NICE평가정보 / KCB |

## API 엔드포인트 주요 목록

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/verify-phone` | 본인인증 로그인/가입 |
| GET | `/api/spots` | 주변 스팟 조회 (위치 기반) |
| POST | `/api/spots` | 스팟 생성 |
| POST | `/api/spots/:id/join` | 스팟 참여 |
| POST | `/api/evaluations` | 평가 제출 |
| GET | `/api/rankings` | 랭킹 조회 |
| POST | `/api/payments/confirm` | 프리미엄 구독 결제 |

## WebSocket 이벤트

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `join_spot` | 클→서 | 채팅방 입장 |
| `send_message` | 클→서 | 메시지 전송 |
| `update_status` | 클→서 | 운동 상태 변경 |
| `new_message` | 서→클 | 새 메시지 수신 |
| `status_updated` | 서→클 | 참여자 상태 변경 |
