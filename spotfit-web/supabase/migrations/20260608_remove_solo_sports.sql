-- 파트너 운동이 아닌 종목 추가 제거: 클라이밍, 요가, 필라테스

DELETE FROM participations
WHERE spot_id IN (
  SELECT s.id FROM spots s
  JOIN sports sp ON s.sport_id = sp.id
  WHERE sp.name IN ('클라이밍', '요가', '필라테스')
);

DELETE FROM chat_messages
WHERE spot_id IN (
  SELECT s.id FROM spots s
  JOIN sports sp ON s.sport_id = sp.id
  WHERE sp.name IN ('클라이밍', '요가', '필라테스')
);

DELETE FROM spots
WHERE sport_id IN (
  SELECT id FROM sports WHERE name IN ('클라이밍', '요가', '필라테스')
);

DELETE FROM sports WHERE name IN ('클라이밍', '요가', '필라테스');
