-- 파트너 운동이 아닌 종목 제거: 야구/소프트볼, 골프, 수영
-- 해당 종목으로 등록된 스팟도 함께 삭제 (CASCADE)

-- 1. 해당 종목 스팟 참가 기록 삭제
DELETE FROM participations
WHERE spot_id IN (
  SELECT s.id FROM spots s
  JOIN sports sp ON s.sport_id = sp.id
  WHERE sp.name IN ('야구/소프트볼', '골프', '수영')
);

-- 2. 해당 종목 스팟 채팅 삭제
DELETE FROM chat_messages
WHERE spot_id IN (
  SELECT s.id FROM spots s
  JOIN sports sp ON s.sport_id = sp.id
  WHERE sp.name IN ('야구/소프트볼', '골프', '수영')
);

-- 3. 해당 종목 스팟 삭제
DELETE FROM spots
WHERE sport_id IN (
  SELECT id FROM sports WHERE name IN ('야구/소프트볼', '골프', '수영')
);

-- 4. 종목 삭제
DELETE FROM sports WHERE name IN ('야구/소프트볼', '골프', '수영');
