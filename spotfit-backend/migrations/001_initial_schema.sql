-- SpotFit Initial Schema
-- NFR-3.4: 위치 정보 30일 익명화 대비 설계 포함

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- 위치 기반 쿼리

-- 종목 테이블
CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  icon_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 태그 테이블
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  classification VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_hash VARCHAR(255) NOT NULL UNIQUE,  -- AES-256 암호화
  nickname VARCHAR(30) NOT NULL UNIQUE,
  profile_image VARCHAR(255),
  activity_region VARCHAR(100),
  manner_score DECIMAL(4,1) DEFAULT 36.5,
  subscription_status VARCHAR(20) DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'expired')),
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  workplace_verified BOOLEAN DEFAULT false,
  school_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 선호 종목
CREATE TABLE user_sports (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, sport_id)
);

-- 사용자 선호 태그
CREATE TABLE user_tags (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

-- 뱃지 테이블
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  condition_type VARCHAR(50) NOT NULL,  -- 'spot_count', 'manner_score', 'region_rank' 등
  condition_value INTEGER NOT NULL,
  image_url VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 뱃지
CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- 스팟 테이블
CREATE TABLE spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  location_name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  location_anonymized BOOLEAN DEFAULT false,  -- NFR-3.4: 30일 후 익명화
  max_participants INTEGER NOT NULL CHECK (max_participants >= 2 AND max_participants <= 50),
  current_participants INTEGER DEFAULT 1,
  difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  status VARCHAR(20) DEFAULT 'recruiting' CHECK (status IN ('recruiting', 'full', 'in_progress', 'completed', 'cancelled')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스팟 공간 인덱스 (위치 기반 검색)
CREATE INDEX idx_spots_location ON spots USING GIST (ST_MakePoint(longitude, latitude));
CREATE INDEX idx_spots_status ON spots (status);
CREATE INDEX idx_spots_starts_at ON spots (starts_at);
CREATE INDEX idx_spots_sport_id ON spots (sport_id);

-- 스팟 태그
CREATE TABLE spot_tags (
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (spot_id, tag_id)
);

-- 참여 테이블
CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'joined' CHECK (status IN ('joined', 'cancelled', 'no_show')),
  evaluation_completed BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- 평가 테이블
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES spots(id),
  evaluator_id UUID NOT NULL REFERENCES users(id),
  evaluated_id UUID NOT NULL REFERENCES users(id),
  is_positive BOOLEAN NOT NULL,
  score_items JSONB NOT NULL DEFAULT '{}',  -- {punctuality, manner, skill, communication}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, evaluator_id, evaluated_id)
);

-- 신고 테이블
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_id UUID NOT NULL REFERENCES users(id),
  spot_id UUID REFERENCES spots(id),
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('profanity', 'harassment', 'no_show', 'fraud', 'other')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'notice', 'status')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_spot_id ON chat_messages (spot_id, created_at DESC);

-- 랭킹 테이블 (주간/월간 집계)
CREATE TABLE rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  sport_id UUID REFERENCES sports(id),
  region VARCHAR(100),
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  activity_score INTEGER DEFAULT 0,
  rank_position INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sport_id, region, period_type, period_start)
);

-- 구독/결제 테이블
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL,
  toss_payment_key VARCHAR(255),
  toss_order_id VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 토큰 테이블
CREATE TABLE notification_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  fcm_token VARCHAR(255) NOT NULL,
  device_type VARCHAR(20) CHECK (device_type IN ('ios', 'android')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 종목 데이터
INSERT INTO sports (name, category) VALUES
  ('축구', '구기'),
  ('농구', '구기'),
  ('배드민턴', '라켓'),
  ('테니스', '라켓'),
  ('탁구', '라켓'),
  ('러닝', '유산소'),
  ('등산', '야외'),
  ('수영', '수상'),
  ('헬스', '웨이트'),
  ('요가', '이너'),
  ('필라테스', '이너'),
  ('클라이밍', '야외'),
  ('자전거', '야외'),
  ('골프', '라켓'),
  ('야구/소프트볼', '구기');

-- 초기 태그 데이터
INSERT INTO tags (name, classification) VALUES
  ('#초보환영', '실력'),
  ('#중급이상', '실력'),
  ('#고수만', '실력'),
  ('#친목위주', '목적'),
  ('#실력향상', '목적'),
  ('#경쟁전', '목적'),
  ('#20대', '연령'),
  ('#30대', '연령'),
  ('#여성전용', '성별'),
  ('#남성전용', '성별'),
  ('#혼성', '성별'),
  ('#실내', '장소'),
  ('#야외', '장소'),
  ('#무료', '비용'),
  ('#소규모', '인원');

-- 초기 뱃지 데이터
INSERT INTO badges (name, description, condition_type, condition_value) VALUES
  ('첫 스팟', '첫 번째 스팟에 참여했습니다', 'spot_count', 1),
  ('10회 참여자', '스팟 10회 참여를 달성했습니다', 'spot_count', 10),
  ('50회 참여자', '스팟 50회 참여를 달성했습니다', 'spot_count', 50),
  ('매너왕', '매너 점수 40점 이상을 유지합니다', 'manner_score', 40),
  ('지역 전설', '지역 랭킹 TOP 10에 진입했습니다', 'region_rank', 10);

-- 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER spots_updated_at BEFORE UPDATE ON spots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
