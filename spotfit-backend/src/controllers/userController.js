const { query } = require('../config/database');

// GET /api/users/me
const getMe = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', sp.id, 'name', sp.name)) FILTER (WHERE sp.id IS NOT NULL), '[]') as preferred_sports,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name, 'imageUrl', b.image_url)) FILTER (WHERE b.id IS NOT NULL), '[]') as badges
      FROM users u
      LEFT JOIN user_sports us ON u.id = us.user_id
      LEFT JOIN sports sp ON us.sport_id = sp.id
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      LEFT JOIN badges b ON ub.badge_id = b.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [req.user.id]);

    const user = result.rows[0];
    res.json({ success: true, data: formatUser(user) });
  } catch (err) { next(err); }
};

// PATCH /api/users/me
const updateMe = async (req, res, next) => {
  try {
    const { nickname, activityRegion, profileImage, preferredSports } = req.body;

    if (nickname) {
      const check = await query('SELECT id FROM users WHERE nickname=$1 AND id!=$2', [nickname, req.user.id]);
      if (check.rows.length) return res.status(409).json({ success: false, message: '이미 사용 중인 닉네임입니다' });
    }

    await query(
      `UPDATE users SET
        nickname=COALESCE($1,nickname),
        activity_region=COALESCE($2,activity_region),
        profile_image=COALESCE($3,profile_image)
       WHERE id=$4`,
      [nickname, activityRegion, profileImage, req.user.id]
    );

    if (preferredSports) {
      await query('DELETE FROM user_sports WHERE user_id=$1', [req.user.id]);
      await Promise.all(preferredSports.map(sportId =>
        query('INSERT INTO user_sports (user_id, sport_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, sportId])
      ));
    }

    res.json({ success: true, message: '프로필이 수정되었습니다' });
  } catch (err) { next(err); }
};

// GET /api/users/me/spots
const getMySpots = async (req, res, next) => {
  try {
    const { type = 'participated', limit = 20, offset = 0 } = req.query;

    let sql;
    if (type === 'hosted') {
      sql = `SELECT s.*, sp.name as sport_name FROM spots s JOIN sports sp ON s.sport_id=sp.id WHERE s.host_id=$1 ORDER BY s.starts_at DESC LIMIT $2 OFFSET $3`;
    } else {
      sql = `SELECT s.*, sp.name as sport_name FROM spots s JOIN sports sp ON s.sport_id=sp.id JOIN participations p ON s.id=p.spot_id WHERE p.user_id=$1 AND p.status='joined' ORDER BY s.starts_at DESC LIMIT $2 OFFSET $3`;
    }

    const result = await query(sql, [req.user.id, parseInt(limit), parseInt(offset)]);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET /api/users/:id
const getUserProfile = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.nickname, u.profile_image, u.manner_score, u.activity_region,
        u.workplace_verified, u.school_verified,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status='joined') as total_spots,
        COALESCE(json_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name, 'imageUrl', b.image_url)) FILTER (WHERE b.id IS NOT NULL), '[]') as badges
      FROM users u
      LEFT JOIN participations p ON u.id=p.user_id
      LEFT JOIN user_badges ub ON u.id=ub.user_id
      LEFT JOIN badges b ON ub.badge_id=b.id
      WHERE u.id=$1 AND u.is_active=true
      GROUP BY u.id
    `, [req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const formatUser = (u) => ({
  id: u.id,
  nickname: u.nickname,
  profileImage: u.profile_image,
  activityRegion: u.activity_region,
  mannerScore: u.manner_score,
  subscriptionStatus: u.subscription_status,
  subscriptionExpiresAt: u.subscription_expires_at,
  workplaceVerified: u.workplace_verified,
  schoolVerified: u.school_verified,
  preferredSports: u.preferred_sports,
  badges: u.badges,
  createdAt: u.created_at,
});

module.exports = { getMe, updateMe, getMySpots, getUserProfile };
