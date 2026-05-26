const axios = require('axios');
const { query } = require('../config/database');

const TOSS_SECRET = process.env.TOSS_SECRET_KEY;
const TOSS_BASE = 'https://api.tosspayments.com/v1';

const tossHeaders = () => ({
  Authorization: `Basic ${Buffer.from(`${TOSS_SECRET}:`).toString('base64')}`,
  'Content-Type': 'application/json',
});

// POST /api/payments/confirm
const confirmPayment = async (req, res, next) => {
  try {
    const { paymentKey, orderId, amount, planType } = req.body;

    // 토스페이먼츠 결제 확인 (NFR-6.1: 멱등성 — orderId 중복 검사)
    const existing = await query('SELECT id FROM subscriptions WHERE toss_order_id=$1', [orderId]);
    if (existing.rows.length) return res.status(409).json({ success: false, message: '이미 처리된 결제입니다' });

    const tossRes = await axios.post(`${TOSS_BASE}/payments/confirm`, { paymentKey, orderId, amount }, { headers: tossHeaders() });
    if (tossRes.data.status !== 'DONE') return res.status(400).json({ success: false, message: '결제 실패' });

    const months = planType === 'yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await query(
      `INSERT INTO subscriptions (user_id,plan_type,amount,toss_payment_key,toss_order_id,starts_at,expires_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),$6)`,
      [req.user.id, planType, amount, paymentKey, orderId, expiresAt]
    );
    await query(
      "UPDATE users SET subscription_status='premium', subscription_expires_at=$1 WHERE id=$2",
      [expiresAt, req.user.id]
    );

    res.json({ success: true, data: { expiresAt, planType } });
  } catch (err) {
    if (err.response?.data) return res.status(400).json({ success: false, message: err.response.data.message });
    next(err);
  }
};

// POST /api/payments/cancel
const cancelSubscription = async (req, res, next) => {
  try {
    const sub = await query(
      "SELECT * FROM subscriptions WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );
    if (!sub.rows[0]) return res.status(404).json({ success: false, message: '활성 구독이 없습니다' });

    await axios.post(`${TOSS_BASE}/payments/${sub.rows[0].toss_payment_key}/cancel`,
      { cancelReason: '사용자 요청 취소' },
      { headers: tossHeaders() }
    );

    await query("UPDATE subscriptions SET status='cancelled' WHERE id=$1", [sub.rows[0].id]);
    await query("UPDATE users SET subscription_status='expired' WHERE id=$1", [req.user.id]);

    res.json({ success: true, message: '구독이 취소되었습니다' });
  } catch (err) { next(err); }
};

// GET /api/payments/status
const getSubscriptionStatus = async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) { next(err); }
};

module.exports = { confirmPayment, cancelSubscription, getSubscriptionStatus };
