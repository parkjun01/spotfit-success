export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // 참여 스팟 수
    const { count: spotCount } = await supabaseAdmin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'joined');

    // 받은 평가 목록
    const { data: evals } = await supabaseAdmin
      .from('evaluations')
      .select('is_positive, score_items')
      .eq('evaluated_id', user.id);

    const total = evals?.length || 0;
    const pos = evals?.filter(e => e.is_positive).length || 0;

    // 세부 점수 집계 (score_items 객체에서 카테고리별 집계)
    let timePos = 0, timeTotal = 0;
    let mannerPos = 0, mannerTotal = 0;
    let skillPos = 0, skillTotal = 0;
    for (const ev of evals || []) {
      const items = ev.score_items as Record<string, boolean> | null;
      if (!items) continue;
      if ('time' in items) { timeTotal++; if (items.time) timePos++; }
      if ('manner' in items) { mannerTotal++; if (items.manner) mannerPos++; }
      if ('skill' in items) { skillTotal++; if (items.skill) skillPos++; }
    }

    const safeRatio = (p: number, t: number) => t === 0 ? 7 : (p / t) * 10;

    return ok({
      spot_count: spotCount || 0,
      monthly_km: null, // GPX 기반 집계 미구현
      time_score: safeRatio(timePos, timeTotal),
      manner_detail: safeRatio(mannerPos, mannerTotal),
      skill_score: safeRatio(skillPos, skillTotal),
      total_evals: total,
      positive_ratio: total ? Math.round((pos / total) * 100) : null,
    });
  } catch (err) { return handleError(err); }
}
