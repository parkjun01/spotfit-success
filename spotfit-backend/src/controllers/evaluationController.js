const { query, getClient } = require('../config/database');
const mannerScoreService = require('../services/mannerScoreService');

// POST /api/evaluations
const submitEvaluation = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { spotId, evaluatedId, isPositive, scoreItems = {} } = req.body;

    // 같은 스팟 참여 확인
    const participation = await client.query(
      "SELECT * FROM participations WHERE spot_id=$1 AND user_id=$2 AND status='joined'",
      [spotId, req.user.id]
    );
    if (!participation.rows[0]) return res.status(403).json({ success: false, message: '참여하지 않은 스팟입니다' });

    const spot = await client.query("SELECT * FROM spots WHERE id=$1 AND status='completed'", [spotId]);
    if (!spot.rows[0]) return res.status(400).json({ success: false, message: '종료된 스팟만 평가할 수 있습니다' });

    await client.query(
      'INSERT INTO evaluations (spot_id,evaluator_id,evaluated_id,is_positive,score_items) VALUES ($1,$2,$3,$4,$5)',
      [spotId, req.user.id, evaluatedId, isPositive, JSON.stringify(scoreItems)]
    );

    await client.query(
      "UPDATE participations SET evaluation_completed=true WHERE spot_id=$1 AND user_id=$2",
      [spotId, req.user.id]
    );

    await client.query('COMMIT');

    // 매너 점수 비동기 업데이트
    mannerScoreService.recalculate(evaluatedId).catch(console.error);
    // 랭킹 업데이트
    mannerScoreService.updateRanking(spotId).catch(console.error);

    res.status(201).json({ success: true, message: '평가가 제출되었습니다' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ success: false, message: '이미 평가를 완료했습니다' });
    next(err);
  } finally { client.release(); }
};

// POST /api/reports
const submitReport = async (req, res, next) => {
  try {
    const { reportedId, spotId, reportType, description } = req.body;
    await query(
      'INSERT INTO reports (reporter_id,reported_id,spot_id,report_type,description) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, reportedId, spotId, reportType, description]
    );
    res.status(201).json({ success: true, message: '신고가 접수되었습니다' });
  } catch (err) { next(err); }
};

// GET /api/evaluations/pending
const getPendingEvaluations = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.id as spot_id, s.title, s.starts_at,
        json_agg(jsonb_build_object('id', u.id, 'nickname', u.nickname, 'profileImage', u.profile_image)) as participants
      FROM spots s
      JOIN participations p ON s.id=p.spot_id AND p.status='joined'
      JOIN participations my_p ON s.id=my_p.spot_id AND my_p.user_id=$1 AND my_p.evaluation_completed=false
      JOIN users u ON p.user_id=u.id AND u.id!=$1
      WHERE s.status='completed'
        AND s.starts_at > NOW() - INTERVAL '24 hours'
        AND NOT EXISTS (SELECT 1 FROM evaluations e WHERE e.spot_id=s.id AND e.evaluator_id=$1 AND e.evaluated_id=u.id)
      GROUP BY s.id, s.title, s.starts_at
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

module.exports = { submitEvaluation, submitReport, getPendingEvaluations };
