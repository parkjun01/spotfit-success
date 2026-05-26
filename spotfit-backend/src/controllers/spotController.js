const { query, getClient } = require('../config/database');
const { sendMulticast } = require('../config/firebase');
const notificationService = require('../services/notificationService');

// GET /api/spots?lat&lng&radius&sportId&tagIds&date&limit&offset
const getSpots = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000, sportId, tagIds, date, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT
        s.*,
        sp.name as sport_name, sp.category as sport_category,
        u.nickname as host_nickname, u.manner_score as host_manner_score,
        u.profile_image as host_profile_image,
        ST_Distance(
          ST_MakePoint(s.longitude, s.latitude)::geography,
          ST_MakePoint($1, $2)::geography
        ) as distance,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags
      FROM spots s
      JOIN sports sp ON s.sport_id = sp.id
      JOIN users u ON s.host_id = u.id
      LEFT JOIN spot_tags stg ON s.id = stg.spot_id
      LEFT JOIN tags t ON stg.tag_id = t.id
      WHERE s.status IN ('recruiting', 'full')
        AND s.starts_at > NOW()
    `;
    const params = [parseFloat(lng) || 0, parseFloat(lat) || 0];
    let paramIdx = 3;

    if (lat && lng) {
      sql += ` AND ST_DWithin(ST_MakePoint(s.longitude, s.latitude)::geography, ST_MakePoint($1, $2)::geography, $${paramIdx})`;
      params.push(parseInt(radius));
      paramIdx++;
    }
    if (sportId) {
      sql += ` AND s.sport_id = $${paramIdx}`;
      params.push(sportId);
      paramIdx++;
    }
    if (date) {
      sql += ` AND DATE(s.starts_at) = $${paramIdx}`;
      params.push(date);
      paramIdx++;
    }
    if (tagIds) {
      const ids = tagIds.split(',');
      sql += ` AND s.id IN (SELECT spot_id FROM spot_tags WHERE tag_id = ANY($${paramIdx}::uuid[]))`;
      params.push(ids);
      paramIdx++;
    }

    sql += ` GROUP BY s.id, sp.name, sp.category, u.nickname, u.manner_score, u.profile_image`;
    sql += ` ORDER BY distance ASC NULLS LAST, s.starts_at ASC`;
    sql += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows.map(formatSpot) });
  } catch (err) { next(err); }
};

// GET /api/spots/:id
const getSpotById = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.*, sp.name as sport_name, u.nickname as host_nickname,
        u.manner_score as host_manner_score, u.profile_image as host_profile_image,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', p.user_id, 'nickname', pu.nickname, 'mannerScore', pu.manner_score, 'profileImage', pu.profile_image)) FILTER (WHERE p.user_id IS NOT NULL AND p.status = 'joined'), '[]') as participants
      FROM spots s
      JOIN sports sp ON s.sport_id = sp.id
      JOIN users u ON s.host_id = u.id
      LEFT JOIN spot_tags stg ON s.id = stg.spot_id
      LEFT JOIN tags t ON stg.tag_id = t.id
      LEFT JOIN participations p ON s.id = p.spot_id AND p.status = 'joined'
      LEFT JOIN users pu ON p.user_id = pu.id
      WHERE s.id = $1
      GROUP BY s.id, sp.name, u.nickname, u.manner_score, u.profile_image
    `, [req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: '스팟을 찾을 수 없습니다' });
    res.json({ success: true, data: formatSpot(result.rows[0]) });
  } catch (err) { next(err); }
};

// POST /api/spots
const createSpot = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { sportId, title, description, locationName, latitude, longitude, maxParticipants, difficultyLevel, startsAt, tagIds = [] } = req.body;

    const spotResult = await client.query(
      `INSERT INTO spots (host_id, sport_id, title, description, location_name, latitude, longitude, max_participants, difficulty_level, starts_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, sportId, title, description, locationName, latitude, longitude, maxParticipants, difficultyLevel || 'beginner', startsAt]
    );
    const spot = spotResult.rows[0];

    await client.query('INSERT INTO participations (spot_id, user_id) VALUES ($1, $2)', [spot.id, req.user.id]);

    if (tagIds.length) {
      await Promise.all(tagIds.map(tagId =>
        client.query('INSERT INTO spot_tags (spot_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [spot.id, tagId])
      ));
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { spotId: spot.id } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

// PATCH /api/spots/:id
const updateSpot = async (req, res, next) => {
  try {
    const spot = await getSpotOrFail(req.params.id, req.user.id, res);
    if (!spot) return;
    if (spot.status !== 'recruiting') return res.status(400).json({ success: false, message: '모집 중인 스팟만 수정할 수 있습니다' });

    const { title, description, maxParticipants, difficultyLevel, startsAt } = req.body;
    await query(
      `UPDATE spots SET title=COALESCE($1,title), description=COALESCE($2,description),
       max_participants=COALESCE($3,max_participants), difficulty_level=COALESCE($4,difficulty_level),
       starts_at=COALESCE($5,starts_at) WHERE id=$6`,
      [title, description, maxParticipants, difficultyLevel, startsAt, req.params.id]
    );

    await notificationService.notifySpotParticipants(req.params.id, '스팟 정보 변경', `${spot.title} 스팟 정보가 변경되었습니다`, { spotId: req.params.id });
    res.json({ success: true, message: '스팟이 수정되었습니다' });
  } catch (err) { next(err); }
};

// DELETE /api/spots/:id
const cancelSpot = async (req, res, next) => {
  try {
    const spot = await getSpotOrFail(req.params.id, req.user.id, res);
    if (!spot) return;
    if (['completed', 'cancelled'].includes(spot.status)) return res.status(400).json({ success: false, message: '이미 종료/취소된 스팟입니다' });

    await query("UPDATE spots SET status='cancelled' WHERE id=$1", [req.params.id]);
    await notificationService.notifySpotParticipants(req.params.id, '스팟 취소', `${spot.title} 스팟이 취소되었습니다`, { spotId: req.params.id, type: 'cancelled' });
    res.json({ success: true, message: '스팟이 취소되었습니다' });
  } catch (err) { next(err); }
};

// POST /api/spots/:id/join
const joinSpot = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const spotResult = await client.query('SELECT * FROM spots WHERE id=$1 FOR UPDATE', [req.params.id]);
    const spot = spotResult.rows[0];
    if (!spot) return res.status(404).json({ success: false, message: '스팟을 찾을 수 없습니다' });
    if (spot.status !== 'recruiting') return res.status(400).json({ success: false, message: '참여할 수 없는 스팟입니다' });
    if (spot.current_participants >= spot.max_participants) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: '정원이 초과되었습니다' });
    }
    // 매너 점수 임계값 확인 (FR-4.4)
    if (parseFloat(req.user.manner_score) < 30) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: '매너 점수가 부족하여 참여할 수 없습니다' });
    }

    await client.query('INSERT INTO participations (spot_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
    const updated = await client.query(
      `UPDATE spots SET current_participants=current_participants+1,
       status=CASE WHEN current_participants+1>=max_participants THEN 'full' ELSE 'recruiting' END
       WHERE id=$1 RETURNING current_participants, status`,
      [req.params.id]
    );

    await client.query('COMMIT');
    await notificationService.notifyUser(spot.host_id, '새 참여자', `${req.user.nickname}님이 ${spot.title}에 참여했습니다`, { spotId: req.params.id });
    await notificationService.scheduleSpotReminder(req.params.id, req.user.id, spot.starts_at);

    res.json({ success: true, data: { currentParticipants: updated.rows[0].current_participants, status: updated.rows[0].status } });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ success: false, message: '이미 참여 중인 스팟입니다' });
    next(err);
  } finally { client.release(); }
};

// DELETE /api/spots/:id/join
const leaveSpot = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const spotResult = await client.query('SELECT * FROM spots WHERE id=$1', [req.params.id]);
    const spot = spotResult.rows[0];
    if (!spot || new Date(spot.starts_at) <= new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: '이미 시작된 스팟은 취소할 수 없습니다' });
    }
    await client.query("UPDATE participations SET status='cancelled' WHERE spot_id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    await client.query(
      `UPDATE spots SET current_participants=current_participants-1,
       status=CASE WHEN status='full' THEN 'recruiting' ELSE status END WHERE id=$1`,
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: '참여가 취소되었습니다' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

const getSpotOrFail = async (spotId, userId, res) => {
  const result = await query('SELECT * FROM spots WHERE id=$1 AND host_id=$2', [spotId, userId]);
  if (!result.rows[0]) {
    res.status(404).json({ success: false, message: '스팟을 찾을 수 없거나 권한이 없습니다' });
    return null;
  }
  return result.rows[0];
};

const formatSpot = (s) => ({
  id: s.id,
  hostId: s.host_id,
  hostNickname: s.host_nickname,
  hostMannerScore: s.host_manner_score,
  hostProfileImage: s.host_profile_image,
  sportName: s.sport_name,
  sportCategory: s.sport_category,
  title: s.title,
  description: s.description,
  locationName: s.location_name,
  latitude: s.location_anonymized ? null : s.latitude,
  longitude: s.location_anonymized ? null : s.longitude,
  maxParticipants: s.max_participants,
  currentParticipants: s.current_participants,
  difficultyLevel: s.difficulty_level,
  status: s.status,
  startsAt: s.starts_at,
  distance: s.distance ? Math.round(s.distance) : null,
  tags: s.tags || [],
  participants: s.participants || [],
  createdAt: s.created_at,
});

module.exports = { getSpots, getSpotById, createSpot, updateSpot, cancelSpot, joinSpot, leaveSpot };
