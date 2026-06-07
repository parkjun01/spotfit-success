-- GiST 인덱스 타입 불일치 수정
-- 기존: geometry 기반 인덱스 → ST_DWithin(geography)에서 미사용
-- 수정: geography 전용 컬럼 추가 + GiST 인덱스 재생성

-- 1. 기존 geometry 인덱스 제거
DROP INDEX IF EXISTS idx_spots_location;

-- 2. 전용 geography 컬럼 추가
ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- 3. 기존 rows에 location 값 채우기
UPDATE spots
  SET location = ST_MakePoint(longitude::double precision, latitude::double precision)::geography
  WHERE location IS NULL;

-- 4. GiST 인덱스 (geography 기반 → ST_DWithin 쿼리에서 직접 활용)
CREATE INDEX idx_spots_location ON spots USING GIST (location);

-- 5. INSERT / UPDATE 시 location 자동 동기화 트리거
CREATE OR REPLACE FUNCTION sync_spot_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_MakePoint(
    NEW.longitude::double precision,
    NEW.latitude::double precision
  )::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spot_location_sync ON spots;
CREATE TRIGGER spot_location_sync
  BEFORE INSERT OR UPDATE OF latitude, longitude ON spots
  FOR EACH ROW EXECUTE FUNCTION sync_spot_location();

-- 6. get_nearby_spots 함수 업데이트 (location 컬럼 직접 사용)
CREATE OR REPLACE FUNCTION get_nearby_spots(
  user_lat FLOAT, user_lng FLOAT, radius_meters INT,
  sport_filter UUID DEFAULT NULL,
  tag_filter UUID[] DEFAULT NULL,
  date_filter DATE DEFAULT NULL,
  page_limit INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, host_id UUID, sport_id UUID, title TEXT, description TEXT,
  location_name TEXT, latitude FLOAT, longitude FLOAT,
  max_participants INT, current_participants INT, difficulty_level TEXT,
  status TEXT, starts_at TIMESTAMPTZ, distance_meters FLOAT,
  sport_name TEXT, host_nickname TEXT, host_manner_score FLOAT
) AS $$
DECLARE
  user_location geography;
BEGIN
  user_location := ST_MakePoint(user_lng, user_lat)::geography;

  RETURN QUERY
  SELECT
    s.id, s.host_id, s.sport_id,
    s.title::TEXT, s.description::TEXT, s.location_name::TEXT,
    s.latitude::FLOAT, s.longitude::FLOAT,
    s.max_participants, s.current_participants,
    s.difficulty_level::TEXT, s.status::TEXT, s.starts_at,
    ST_Distance(s.location, user_location) AS distance_meters,
    sp.name::TEXT AS sport_name,
    u.nickname::TEXT AS host_nickname,
    u.manner_score::FLOAT AS host_manner_score
  FROM spots s
  JOIN sports sp ON s.sport_id = sp.id
  JOIN users u   ON s.host_id  = u.id
  WHERE
    s.status IN ('recruiting', 'full')
    AND s.starts_at > NOW()
    AND ST_DWithin(s.location, user_location, radius_meters)  -- GiST 인덱스 활용
    AND (sport_filter IS NULL OR s.sport_id = sport_filter)
    AND (date_filter  IS NULL OR DATE(s.starts_at) = date_filter)
    AND (tag_filter   IS NULL OR s.id IN (
          SELECT spot_id FROM spot_tags WHERE tag_id = ANY(tag_filter)
        ))
  ORDER BY distance_meters ASC, s.starts_at ASC
  LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;
