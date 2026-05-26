const cron = require('node-cron');
const { query } = require('../config/database');
const notificationService = require('../services/notificationService');
const mannerScoreService = require('../services/mannerScoreService');

const startScheduler = () => {
  // 매 5분: 시작 시간 경과 스팟 자동 진행중으로 변경 (FR-2.2)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await query(`
        UPDATE spots SET status='in_progress'
        WHERE status IN ('recruiting','full') AND starts_at <= NOW()
      `);
    } catch (err) { console.error('Spot status update error:', err.message); }
  });

  // 매 10분: 시작 2시간 경과 스팟 자동 완료 처리 (FR-2.2)
  cron.schedule('*/10 * * * *', async () => {
    try {
      const result = await query(`
        UPDATE spots SET status='completed'
        WHERE status='in_progress' AND starts_at < NOW() - INTERVAL '2 hours'
        RETURNING id
      `);
      for (const spot of result.rows) {
        await notificationService.sendEvaluationRequests(spot.id);
        await mannerScoreService.updateRanking(spot.id);
      }
    } catch (err) { console.error('Spot completion error:', err.message); }
  });

  // 매 1시간: 스팟 시작 1시간 전 알림 발송 (FR-7.1)
  cron.schedule('0 * * * *', async () => {
    try {
      await notificationService.sendSpotReminders();
    } catch (err) { console.error('Spot reminder error:', err.message); }
  });

  // 매일 자정: 노쇼 처리 (FR-4.3)
  cron.schedule('0 0 * * *', async () => {
    try {
      await mannerScoreService.processNoShows();
    } catch (err) { console.error('No-show processing error:', err.message); }
  });

  // 매일 새벽 2시: 30일 지난 위치 정보 익명화 (NFR-3.4)
  cron.schedule('0 2 * * *', async () => {
    try {
      await query(`
        UPDATE spots SET
          latitude=ROUND(latitude::numeric, 2),
          longitude=ROUND(longitude::numeric, 2),
          location_anonymized=true
        WHERE starts_at < NOW() - INTERVAL '30 days'
          AND location_anonymized=false
      `);
    } catch (err) { console.error('Location anonymization error:', err.message); }
  });

  // 매일 자정: 만료된 구독 처리
  cron.schedule('0 0 * * *', async () => {
    try {
      await query(`
        UPDATE users SET subscription_status='expired'
        WHERE subscription_status='premium' AND subscription_expires_at < NOW()
      `);
    } catch (err) { console.error('Subscription expiry error:', err.message); }
  });

  console.log('Scheduler started');
};

module.exports = { startScheduler };
