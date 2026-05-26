const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { hash } = require('../utils/crypto');

const generateTokens = (userId) => {
  const access = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refresh = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { access, refresh };
};

// POST /api/auth/verify-phone
// PASS 본인인증 완료 후 토큰을 받아 처리 (FR-1.1)
const verifyPhone = async (req, res, next) => {
  try {
    const { phoneToken, nickname, preferredSports = [], activityRegion } = req.body;
    if (!phoneToken) return res.status(400).json({ success: false, message: '인증 토큰이 필요합니다' });

    // 실제 환경에서는 PASS API로 phoneToken 검증 후 전화번호 획득
    // 개발 환경: phoneToken을 전화번호로 사용
    const phoneHash = hash(phoneToken);

    let user = (await query('SELECT * FROM users WHERE phone_hash = $1', [phoneHash])).rows[0];

    if (!user) {
      // 신규 가입
      if (!nickname) return res.status(400).json({ success: false, message: '닉네임이 필요합니다' });
      const nicknameCheck = await query('SELECT id FROM users WHERE nickname = $1', [nickname]);
      if (nicknameCheck.rows.length) return res.status(409).json({ success: false, message: '이미 사용 중인 닉네임입니다' });

      const result = await query(
        'INSERT INTO users (phone_hash, nickname, activity_region) VALUES ($1, $2, $3) RETURNING *',
        [phoneHash, nickname, activityRegion]
      );
      user = result.rows[0];

      if (preferredSports.length) {
        await Promise.all(preferredSports.map(sportId =>
          query('INSERT INTO user_sports (user_id, sport_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, sportId])
        ));
      }
    }

    const tokens = generateTokens(user.id);
    res.json({ success: true, data: { user: sanitizeUser(user), ...tokens } });
  } catch (err) { next(err); }
};

// POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Refresh 토큰이 필요합니다' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다' });
    const tokens = generateTokens(decoded.userId);
    res.json({ success: true, data: tokens });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '토큰이 만료되었습니다' });
    }
    next(err);
  }
};

// GET /api/auth/check-nickname/:nickname
const checkNickname = async (req, res, next) => {
  try {
    const { nickname } = req.params;
    const result = await query('SELECT id FROM users WHERE nickname = $1', [nickname]);
    res.json({ success: true, data: { available: result.rows.length === 0 } });
  } catch (err) { next(err); }
};

// DELETE /api/auth/withdraw
const withdraw = async (req, res, next) => {
  try {
    await query('UPDATE users SET is_active = false, phone_hash = $1, nickname = $2 WHERE id = $3', [
      `deleted_${Date.now()}`,
      `탈퇴한사용자_${Date.now()}`,
      req.user.id,
    ]);
    res.json({ success: true, message: '탈퇴 처리되었습니다' });
  } catch (err) { next(err); }
};

// POST /api/auth/fcm-token
const saveFcmToken = async (req, res, next) => {
  try {
    const { fcmToken, deviceType } = req.body;
    await query(
      `INSERT INTO notification_tokens (user_id, fcm_token, device_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET fcm_token = $2, device_type = $3, updated_at = NOW()`,
      [req.user.id, fcmToken, deviceType]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

const sanitizeUser = (user) => ({
  id: user.id,
  nickname: user.nickname,
  profileImage: user.profile_image,
  activityRegion: user.activity_region,
  mannerScore: user.manner_score,
  subscriptionStatus: user.subscription_status,
  workplaceVerified: user.workplace_verified,
  schoolVerified: user.school_verified,
  createdAt: user.created_at,
});

module.exports = { verifyPhone, refreshToken, checkNickname, withdraw, saveFcmToken };
