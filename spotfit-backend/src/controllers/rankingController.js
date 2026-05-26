const { query } = require('../config/database');
const redis = require('../config/redis');

// GET /api/rankings?type=weekly|monthly&sportId&region
const getRankings = async (req, res, next) => {
  try {
    const { type = 'weekly', sportId, region, limit = 50 } = req.query;
    const cacheKey = `ranking:${type}:${sportId || 'all'}:${region || 'all'}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const now = new Date();
    const periodStart = type === 'weekly'
      ? new Date(now.setDate(now.getDate() - now.getDay()))
      : new Date(now.getFullYear(), now.getMonth(), 1);

    let sql = `
      SELECT u.id, u.nickname, u.profile_image, u.manner_score,
        COUNT(p.id) as spot_count,
        SUM(CASE WHEN p.status='joined' THEN 10 ELSE 0 END) +
        SUM(CASE WHEN p.evaluation_completed THEN 5 ELSE 0 END) as activity_score,
        RANK() OVER (ORDER BY
          SUM(CASE WHEN p.status='joined' THEN 10 ELSE 0 END) +
          SUM(CASE WHEN p.evaluation_completed THEN 5 ELSE 0 END) DESC
        ) as rank_position
      FROM users u
      JOIN participations p ON u.id=p.user_id
      JOIN spots s ON p.spot_id=s.id
      WHERE s.starts_at >= $1 AND s.status='completed'
    `;
    const params = [periodStart.toISOString()];
    let idx = 2;

    if (sportId) { sql += ` AND s.sport_id=$${idx}`; params.push(sportId); idx++; }
    if (region) { sql += ` AND u.activity_region=$${idx}`; params.push(region); idx++; }

    sql += ` GROUP BY u.id, u.nickname, u.profile_image, u.manner_score ORDER BY activity_score DESC LIMIT $${idx}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);
    await redis.set(cacheKey, result.rows, 300); // 5분 캐시

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/rankings/me
const getMyRanking = async (req, res, next) => {
  try {
    const { type = 'weekly', sportId } = req.query;
    const now = new Date();
    const periodStart = type === 'weekly'
      ? new Date(now.setDate(now.getDate() - now.getDay()))
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await query(`
      SELECT COUNT(*) + 1 as rank_position,
        (SELECT COUNT(p2.id) FROM participations p2 JOIN spots s2 ON p2.spot_id=s2.id
         WHERE p2.user_id=$1 AND s2.starts_at>=$2 ${sportId ? 'AND s2.sport_id=$3' : ''}) as my_spot_count
      FROM (
        SELECT u.id, SUM(CASE WHEN p.status='joined' THEN 10 ELSE 0 END) as score
        FROM users u JOIN participations p ON u.id=p.user_id JOIN spots s ON p.spot_id=s.id
        WHERE s.starts_at>=$2 AND s.status='completed' ${sportId ? 'AND s.sport_id=$3' : ''}
        GROUP BY u.id
      ) sub
      WHERE sub.score > (
        SELECT SUM(CASE WHEN p.status='joined' THEN 10 ELSE 0 END) FROM participations p JOIN spots s ON p.spot_id=s.id
        WHERE p.user_id=$1 AND s.starts_at>=$2 ${sportId ? 'AND s.sport_id=$3' : ''}
      )
    `, sportId ? [req.user.id, periodStart.toISOString(), sportId] : [req.user.id, periodStart.toISOString()]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// GET /api/sports
const getSports = async (req, res, next) => {
  try {
    const cached = await redis.get('sports:all');
    if (cached) return res.json({ success: true, data: cached });
    const result = await query('SELECT * FROM sports WHERE is_active=true ORDER BY category, name');
    await redis.set('sports:all', result.rows, 3600);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/tags
const getTags = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM tags ORDER BY classification, name');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = { getRankings, getMyRanking, getSports, getTags };
