const { query } = require('../config/database');
const redis = require('../config/redis');

// 매너 점수 재계산 (FR-4.2: 가중 평균)
const recalculate = async (userId) => {
  const result = await query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_positive THEN 1 ELSE 0 END) as positives,
      AVG(CASE WHEN score_items->>'punctuality' IS NOT NULL THEN (score_items->>'punctuality')::int ELSE NULL END) as avg_punctuality
    FROM evaluations
    WHERE evaluated_id = $1
  `, [userId]);

  const { total, positives } = result.rows[0];
  if (parseInt(total) === 0) return;

  const positiveRatio = parseInt(positives) / parseInt(total);
  // 기본 점수 36.5 기준, 긍정 비율로 ±10점 범위
  const newScore = Math.max(0, Math.min(50, 36.5 + (positiveRatio - 0.5) * 20)).toFixed(1);

  await query('UPDATE users SET manner_score=$1 WHERE id=$2', [newScore, userId]);
  await checkAndAwardBadge(userId, 'manner_score', parseFloat(newScore));
};

// 노쇼 감지 및 점수 차감 (FR-4.3)
const applyNoShowPenalty = async (userId, spotId) => {
  await query("UPDATE participations SET status='no_show' WHERE spot_id=$1 AND user_id=$2", [spotId, userId]);
  await query('UPDATE users SET manner_score=GREATEST(0, manner_score-5) WHERE id=$1', [userId]);
};

// 배치 처리: 시작 후 30분이 지난 스팟의 미참여자 노쇼 처리
const processNoShows = async () => {
  const result = await query(`
    SELECT p.user_id, p.spot_id
    FROM participations p
    JOIN spots s ON p.spot_id=s.id
    WHERE s.status='in_progress'
      AND s.starts_at < NOW() - INTERVAL '30 minutes'
      AND p.status='joined'
      AND p.user_id != s.host_id
  `);

  for (const row of result.rows) {
    await applyNoShowPenalty(row.user_id, row.spot_id);
  }
};

// 스팟 종료 후 랭킹 점수 갱신
const updateRanking = async (spotId) => {
  const spot = await query('SELECT host_id, sport_id FROM spots WHERE id=$1', [spotId]);
  if (!spot.rows[0]) return;

  const participants = await query(
    "SELECT user_id FROM participations WHERE spot_id=$1 AND status='joined'",
    [spotId]
  );

  const now = new Date();
  const weekKey = `ranking:weekly:${now.getFullYear()}W${getWeekNumber(now)}`;
  const monthKey = `ranking:monthly:${now.getFullYear()}-${now.getMonth() + 1}`;

  for (const { user_id } of participants.rows) {
    await redis.zAdd(`${weekKey}:${spot.rows[0].sport_id}`, 10, user_id);
    await redis.zAdd(`${monthKey}:${spot.rows[0].sport_id}`, 10, user_id);
    await redis.zAdd(`${weekKey}:all`, 10, user_id);
    await checkAndAwardBadge(user_id, 'spot_count');
  }
};

const checkAndAwardBadge = async (userId, conditionType, value) => {
  let checkValue = value;
  if (conditionType === 'spot_count') {
    const cnt = await query("SELECT COUNT(*) FROM participations WHERE user_id=$1 AND status='joined'", [userId]);
    checkValue = parseInt(cnt.rows[0].count);
  }

  const badges = await query(
    'SELECT * FROM badges WHERE condition_type=$1 AND condition_value<=$2',
    [conditionType, checkValue]
  );

  for (const badge of badges.rows) {
    await query(
      'INSERT INTO user_badges (user_id,badge_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [userId, badge.id]
    );
  }
};

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

module.exports = { recalculate, applyNoShowPenalty, processNoShows, updateRanking, checkAndAwardBadge };
