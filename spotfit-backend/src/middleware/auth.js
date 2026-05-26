const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증이 필요합니다' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, nickname, manner_score, subscription_status FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
    if (!result.rows[0]) {
      return res.status(401).json({ success: false, message: '유효하지 않은 사용자입니다' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '토큰이 만료되었습니다', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('SELECT id, nickname, manner_score, subscription_status FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
    req.user = result.rows[0] || null;
  } catch {
    req.user = null;
  }
  next();
};

const requirePremium = (req, res, next) => {
  if (req.user?.subscription_status !== 'premium') {
    return res.status(403).json({ success: false, message: '프리미엄 구독이 필요합니다' });
  }
  next();
};

module.exports = { authenticate, optionalAuth, requirePremium };
