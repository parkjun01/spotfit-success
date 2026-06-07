import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

/**
 * POST /api/admin/run-scheduler
 *
 * [1] 노쇼 감지 (starts_at 기준 30분 경과 + status = 'joined')
 *     → participations.status = 'no_show'
 *     → users.manner_score -= 5 (하한 0)
 *
 * [2] 스팟 자동 완료 (starts_at 기준 2시간 경과)
 *     → spots.status = 'completed'
 *
 * Vercel은 상시 cron을 지원하지 않아 외부 cron 서비스(예: cron-job.org)에서
 * 이 엔드포인트를 주기적으로 호출하거나, 개발 중에는 수동으로 호출한다.
 */
export async function POST(_req: NextRequest) {
  try {
    const now = new Date();
    const log: string[] = [];

    // ── [1] 노쇼 감지 ─────────────────────────────────────────────────────
    const noShowCutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    // starts_at이 30분 이상 지났지만 아직 joined인 참가자 목록
    const { data: candidates, error: fetchErr } = await supabaseAdmin
      .from('participations')
      .select('user_id, spot_id, spots!inner(starts_at, status, host_id)')
      .eq('status', 'joined')
      .not('spots.status', 'in', '("completed","cancelled")')
      .lt('spots.starts_at', noShowCutoff);

    if (fetchErr) throw fetchErr;

    let noShowCount = 0;
    for (const row of candidates || []) {
      const spot = (row as any).spots;
      // 호스트는 노쇼 대상 제외 (호스트가 없으면 스팟 자체가 의미 없음)
      if (row.user_id === spot.host_id) continue;

      // 1-a. 참여 상태를 no_show로 전환
      const { error: updateErr } = await supabaseAdmin
        .from('participations')
        .update({ status: 'no_show' })
        .eq('spot_id', row.spot_id)
        .eq('user_id', row.user_id);
      if (updateErr) continue;

      // 1-b. 매너 점수 -5점 (직접 계산, 하한 0)
      const { data: u } = await supabaseAdmin
        .from('users')
        .select('manner_score')
        .eq('id', row.user_id)
        .single();
      if (u) {
        const newScore = Math.max(0, parseFloat(u.manner_score) - 5);
        await supabaseAdmin
          .from('users')
          .update({ manner_score: newScore })
          .eq('id', row.user_id);
      }

      noShowCount++;
    }
    log.push(`노쇼 처리: ${noShowCount}명 (매너점수 -5점)`);

    // ── [2] 스팟 자동 완료 ────────────────────────────────────────────────
    const autoCompleteCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const { data: expiredSpots, error: expiredErr } = await supabaseAdmin
      .from('spots')
      .select('id')
      .in('status', ['recruiting', 'full', 'in_progress'])
      .lt('starts_at', autoCompleteCutoff);

    if (expiredErr) throw expiredErr;

    if (expiredSpots && expiredSpots.length > 0) {
      const ids = expiredSpots.map((s: any) => s.id);
      await supabaseAdmin
        .from('spots')
        .update({ status: 'completed' })
        .in('id', ids);
      log.push(`스팟 자동 완료: ${ids.length}개`);
    } else {
      log.push('자동 완료 대상 없음');
    }

    return ok({ success: true, processed_at: now.toISOString(), log });
  } catch (err) {
    return handleError(err);
  }
}

// 현재 스케줄러 대기 항목 수 확인
export async function GET() {
  try {
    const now = new Date();
    const noShowCutoff = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const autoCompleteCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const [noShowRes, autoCompleteRes] = await Promise.all([
      supabaseAdmin
        .from('participations')
        .select('spot_id, spots!inner(starts_at)', { count: 'exact', head: true })
        .eq('status', 'joined')
        .lt('spots.starts_at', noShowCutoff),
      supabaseAdmin
        .from('spots')
        .select('id', { count: 'exact', head: true })
        .in('status', ['recruiting', 'full', 'in_progress'])
        .lt('starts_at', autoCompleteCutoff),
    ]);

    return ok({
      checked_at: now.toISOString(),
      pending_noshow: noShowRes.count ?? 0,
      pending_auto_complete: autoCompleteRes.count ?? 0,
    });
  } catch (err) {
    return handleError(err);
  }
}
