import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, created, error, handleError } from '@/lib/response';

// GET /api/evaluations?pending=true
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    // 완료된 스팟에서 아직 평가 안 한 것들
    const { data: myParts, error: err } = await supabaseAdmin
      .from('participations')
      .select(`spot_id, evaluation_completed, spots!inner(id, title, starts_at, status, participations(user_id, status, users(id, nickname, profile_image)))`)
      .eq('user_id', user.id)
      .eq('evaluation_completed', false)
      .eq('status', 'joined');
    if (err) throw err;
    // 클라이언트에서 completed 스팟만 필터링
    const pending = (myParts || []).filter((p: any) => p.spots?.status === 'completed');
    return ok(pending);
  } catch (err) { return handleError(err); }
}

// POST /api/evaluations
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { spotId, evaluatedId, isPositive, scoreItems = {} } = await req.json();

    const { data: spot } = await supabaseAdmin.from('spots').select('status').eq('id', spotId).single();
    if (!spot || spot.status !== 'completed') return error('종료된 스팟만 평가할 수 있습니다');

    const { error: insertErr } = await supabaseAdmin.from('evaluations').insert({
      spot_id: spotId, evaluator_id: user.id, evaluated_id: evaluatedId,
      is_positive: isPositive, score_items: scoreItems,
    });
    if (insertErr?.code === '23505') return error('이미 평가를 완료했습니다', 409);
    if (insertErr) throw insertErr;

    await supabaseAdmin.from('participations').update({ evaluation_completed: true })
      .eq('spot_id', spotId).eq('user_id', user.id);

    // 매너 점수 재계산
    await recalculateMannerScore(evaluatedId);

    return created(null);
  } catch (err) { return handleError(err); }
}

async function recalculateMannerScore(userId: string) {
  const { data } = await supabaseAdmin
    .from('evaluations')
    .select('is_positive')
    .eq('evaluated_id', userId);
  if (!data?.length) return;
  const positiveRatio = data.filter(e => e.is_positive).length / data.length;
  const newScore = Math.max(0, Math.min(50, 36.5 + (positiveRatio - 0.5) * 20)).toFixed(1);
  await supabaseAdmin.from('users').update({ manner_score: parseFloat(newScore) }).eq('id', userId);
}
