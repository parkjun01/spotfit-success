import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { data: spot } = await supabaseAdmin
      .from('spots')
      .select('host_id, status, starts_at')
      .eq('id', params.id)
      .single();

    if (!spot) return error('스팟을 찾을 수 없습니다', 404);
    if (spot.host_id !== user.id) return error('호스트만 종료할 수 있습니다', 403);
    if (['completed', 'cancelled'].includes(spot.status)) return error('이미 종료된 스팟입니다');

    await supabaseAdmin.from('spots').update({ status: 'completed' }).eq('id', params.id);

    // 시작 후 30분이 지난 경우 아직 joined 상태인 참가자를 노쇼로 처리
    if (spot.starts_at) {
      const noShowThreshold = new Date(new Date(spot.starts_at).getTime() + 30 * 60 * 1000);
      if (new Date() > noShowThreshold) {
        const { data: stillJoined } = await supabaseAdmin
          .from('participations')
          .select('user_id')
          .eq('spot_id', params.id)
          .eq('status', 'joined')
          .neq('user_id', spot.host_id); // 호스트는 제외

        for (const p of stillJoined || []) {
          await supabaseAdmin
            .from('participations')
            .update({ status: 'no_show' })
            .eq('spot_id', params.id)
            .eq('user_id', p.user_id);

          // 노쇼 매너점수 -5점
          const { data: u } = await supabaseAdmin
            .from('users').select('manner_score').eq('id', p.user_id).single();
          if (u) {
            await supabaseAdmin
              .from('users')
              .update({ manner_score: Math.max(0, parseFloat(u.manner_score) - 5) })
              .eq('id', p.user_id);
          }
        }
      }
    }

    return ok(null);
  } catch (err) { return handleError(err); }
}
