const { query } = require('../config/database');
const { sendPush, sendMulticast } = require('../config/firebase');

const getToken = async (userId) => {
  const result = await query('SELECT fcm_token FROM notification_tokens WHERE user_id=$1', [userId]);
  return result.rows[0]?.fcm_token || null;
};

const getSpotParticipantTokens = async (spotId, excludeUserId) => {
  const result = await query(`
    SELECT nt.fcm_token FROM notification_tokens nt
    JOIN participations p ON nt.user_id=p.user_id
    WHERE p.spot_id=$1 AND p.status='joined' AND nt.user_id!=$2
  `, [spotId, excludeUserId || '00000000-0000-0000-0000-000000000000']);
  return result.rows.map(r => r.fcm_token).filter(Boolean);
};

const notifyUser = async (userId, title, body, data = {}) => {
  const token = await getToken(userId);
  if (!token) return;
  return sendPush(token, title, body, data);
};

const notifySpotParticipants = async (spotId, title, body, data = {}, excludeUserId = null) => {
  const tokens = await getSpotParticipantTokens(spotId, excludeUserId);
  if (!tokens.length) return;
  return sendMulticast(tokens, title, body, data);
};

// FR-7.1: 스팟 시작 1시간 전 푸시 (cron job에서 호출)
const sendSpotReminders = async () => {
  const result = await query(`
    SELECT s.id as spot_id, s.title, p.user_id
    FROM spots s
    JOIN participations p ON s.id=p.spot_id AND p.status='joined'
    WHERE s.status IN ('recruiting','full')
      AND s.starts_at BETWEEN NOW() + INTERVAL '55 minutes' AND NOW() + INTERVAL '65 minutes'
  `);

  const spotGroups = {};
  for (const row of result.rows) {
    if (!spotGroups[row.spot_id]) spotGroups[row.spot_id] = { title: row.title, userIds: [] };
    spotGroups[row.spot_id].userIds.push(row.user_id);
  }

  for (const [spotId, { title, userIds }] of Object.entries(spotGroups)) {
    for (const userId of userIds) {
      await notifyUser(userId, '스팟 시작 1시간 전', `${title} 스팟이 1시간 후 시작됩니다`, { spotId, type: 'reminder' });
    }
  }
};

// FR-7.3: 스팟 종료 후 평가 요청 알림
const sendEvaluationRequests = async (spotId) => {
  const result = await query(`
    SELECT s.title, p.user_id FROM spots s
    JOIN participations p ON s.id=p.spot_id AND p.status='joined' AND p.evaluation_completed=false
    WHERE s.id=$1
  `, [spotId]);

  for (const row of result.rows) {
    await notifyUser(row.user_id, '평가 요청', `${row.title} 스팟은 어떠셨나요? 동반자를 평가해주세요`, { spotId, type: 'evaluation' });
  }
};

const scheduleSpotReminder = async (spotId, userId, startsAt) => {
  // Redis에 알림 예약 저장 (cron이 주기적으로 확인)
  const redis = require('../config/redis');
  await redis.set(`reminder:${spotId}:${userId}`, { spotId, userId, startsAt }, 86400);
};

module.exports = { notifyUser, notifySpotParticipants, sendSpotReminders, sendEvaluationRequests, scheduleSpotReminder };
