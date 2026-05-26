-- SpotFit Supabase 마이그레이션
-- Supabase 대시보드 > SQL Editor에 붙여넣기 후 실행

-- PostGIS 확장 (위치 기반 검색)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ==================== 테이블 ====================

CREATE TABLE sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  icon_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  classification VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_hash VARCHAR(255) NOT NULL UNIQUE,
  nickname VARCHAR(30) NOT NULL UNIQUE,
  profile_image VARCHAR(255),
  activity_region VARCHAR(100),
  manner_score DECIMAL(4,1) DEFAULT 36.5,
  subscription_status VARCHAR(20) DEFAULT 'free' CHECK (subscription_status IN ('free','premium','expired')),
  subscription_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  workplace_verified BOOLEAN DEFAULT false,
  school_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_sports (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, sport_id)
);

CREATE TABLE user_tags (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL,
  image_url VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_badges (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  location_name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  location_anonymized BOOLEAN DEFAULT false,
  max_participants INTEGER NOT NULL CHECK (max_participants BETWEEN 2 AND 50),
  current_participants INTEGER DEFAULT 1,
  difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner','intermediate','advanced')),
  status VARCHAR(20) DEFAULT 'recruiting' CHECK (status IN ('recruiting','full','in_progress','completed','cancelled')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spots_location ON spots USING GIST (ST_MakePoint(longitude, latitude));
CREATE INDEX idx_spots_status ON spots(status);
CREATE INDEX idx_spots_starts_at ON spots(starts_at);
CREATE INDEX idx_spots_sport_id ON spots(sport_id);

CREATE TABLE spot_tags (
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (spot_id, tag_id)
);

CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'joined' CHECK (status IN ('joined','cancelled','no_show')),
  evaluation_completed BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES spots(id),
  evaluator_id UUID NOT NULL REFERENCES users(id),
  evaluated_id UUID NOT NULL REFERENCES users(id),
  is_positive BOOLEAN NOT NULL,
  score_items JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, evaluator_id, evaluated_id)
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_id UUID NOT NULL REFERENCES users(id),
  spot_id UUID REFERENCES spots(id),
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('profanity','harassment','no_show','fraud','other')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','notice','status')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_spot ON chat_messages(spot_id, created_at DESC);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly','yearly')),
  amount INTEGER NOT NULL,
  toss_payment_key VARCHAR(255),
  toss_order_id VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  fcm_token VARCHAR(255) NOT NULL,
  device_type VARCHAR(20) CHECK (device_type IN ('ios','android','web')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Row Level Security ====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 모든 SELECT는 공개 허용 (커스텀 JWT 사용 → auth.uid() 사용 불가)
-- INSERT/UPDATE/DELETE는 API 라우트에서 service_role 키로만 처리 → RLS 우회
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "spots_select" ON spots FOR SELECT USING (true);
CREATE POLICY "participations_select" ON participations FOR SELECT USING (true);
CREATE POLICY "chat_select" ON chat_messages FOR SELECT USING (true);
-- 채팅 메시지는 프론트엔드에서 직접 insert (Supabase Realtime 패턴)
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT WITH CHECK (true);

-- ==================== Supabase Realtime 활성화 ====================
-- 채팅용 Realtime 발행 설정
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE spots;

-- ==================== RPC 함수 (위치 기반 검색) ====================

CREATE OR REPLACE FUNCTION get_nearby_spots(
  user_lat FLOAT, user_lng FLOAT, radius_meters INT,
  sport_filter UUID DEFAULT NULL,
  tag_filter UUID[] DEFAULT NULL,
  date_filter DATE DEFAULT NULL,
  page_limit INT DEFAULT 20, page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, host_id UUID, sport_id UUID, title TEXT, description TEXT,
  location_name TEXT, latitude FLOAT, longitude FLOAT,
  max_participants INT, current_participants INT, difficulty_level TEXT,
  status TEXT, starts_at TIMESTAMPTZ, distance_meters FLOAT,
  sport_name TEXT, host_nickname TEXT, host_manner_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.host_id, s.sport_id, s.title::TEXT, s.description::TEXT,
    s.location_name::TEXT, s.latitude::FLOAT, s.longitude::FLOAT,
    s.max_participants, s.current_participants, s.difficulty_level::TEXT,
    s.status::TEXT, s.starts_at,
    ST_Distance(
      ST_MakePoint(s.longitude, s.latitude)::geography,
      ST_MakePoint(user_lng, user_lat)::geography
    ) as distance_meters,
    sp.name::TEXT as sport_name,
    u.nickname::TEXT as host_nickname,
    u.manner_score::FLOAT as host_manner_score
  FROM spots s
  JOIN sports sp ON s.sport_id = sp.id
  JOIN users u ON s.host_id = u.id
  WHERE s.status IN ('recruiting','full')
    AND s.starts_at > NOW()
    AND ST_DWithin(
      ST_MakePoint(s.longitude, s.latitude)::geography,
      ST_MakePoint(user_lng, user_lat)::geography,
      radius_meters
    )
    AND (sport_filter IS NULL OR s.sport_id = sport_filter)
    AND (date_filter IS NULL OR DATE(s.starts_at) = date_filter)
    AND (tag_filter IS NULL OR s.id IN (
      SELECT spot_id FROM spot_tags WHERE tag_id = ANY(tag_filter)
    ))
  ORDER BY distance_meters ASC, s.starts_at ASC
  LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- ==================== RPC 함수 (랭킹 집계) ====================

CREATE OR REPLACE FUNCTION get_rankings(
  period_type TEXT DEFAULT 'weekly',
  period_start TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  sport_filter UUID DEFAULT NULL,
  page_limit INT DEFAULT 50
)
RETURNS TABLE (
  user_id UUID, nickname TEXT, profile_image TEXT,
  manner_score FLOAT, activity_score INT, spot_count INT, rank_position BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_counts AS (
    SELECT p.user_id,
      COUNT(*)::INT AS cnt
    FROM participations p
    JOIN spots s ON s.id = p.spot_id
    WHERE p.status = 'joined'
      AND s.status = 'completed'
      AND s.starts_at >= period_start
      AND (sport_filter IS NULL OR s.sport_id = sport_filter)
    GROUP BY p.user_id
  )
  SELECT
    u.id AS user_id,
    u.nickname::TEXT,
    u.profile_image::TEXT,
    u.manner_score::FLOAT,
    (uc.cnt * 10)::INT AS activity_score,
    uc.cnt AS spot_count,
    ROW_NUMBER() OVER (ORDER BY uc.cnt DESC, u.manner_score DESC) AS rank_position
  FROM user_counts uc
  JOIN users u ON u.id = uc.user_id
  WHERE u.is_active = true
  ORDER BY rank_position
  LIMIT page_limit;
END;
$$ LANGUAGE plpgsql;

-- ==================== 트리거 ====================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER spots_updated_at BEFORE UPDATE ON spots FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================== 초기 데이터 ====================

INSERT INTO sports (name, category) VALUES
  ('축구','구기'),('농구','구기'),('배드민턴','라켓'),('테니스','라켓'),
  ('탁구','라켓'),('러닝','유산소'),('등산','야외'),('수영','수상'),
  ('헬스','웨이트'),('요가','이너'),('필라테스','이너'),('클라이밍','야외'),
  ('자전거','야외'),('골프','라켓'),('야구/소프트볼','구기');

INSERT INTO tags (name, classification) VALUES
  ('#초보환영','실력'),('#중급이상','실력'),('#고수만','실력'),
  ('#친목위주','목적'),('#실력향상','목적'),('#경쟁전','목적'),
  ('#20대','연령'),('#30대','연령'),('#여성전용','성별'),
  ('#남성전용','성별'),('#혼성','성별'),('#실내','장소'),
  ('#야외','장소'),('#무료','비용'),('#소규모','인원');

INSERT INTO badges (name, description, condition_type, condition_value) VALUES
  ('첫 스팟','첫 번째 스팟에 참여','spot_count',1),
  ('10회 참여자','스팟 10회 참여','spot_count',10),
  ('50회 참여자','스팟 50회 참여','spot_count',50),
  ('매너왕','매너 점수 40점 이상','manner_score',40),
  ('지역 전설','지역 랭킹 TOP 10 진입','region_rank',10);
