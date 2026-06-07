import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

// POST /api/spots/:id/join — 신청 (팀장 승인 대기 상태)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);

    const { data: spot } = await supabaseAdmin.from('spots').select('*').eq('id', params.id).single();
    if (!spot) return error('스팟을 찾을 수 없습니다', 404);
    if (spot.host_id === user.id) return error('자신이 개설한 스팟입니다');
    if (spot.status !== 'recruiting') return error('참여할 수 없는 스팟입니다');
    if (spot.current_participants >= spot.max_participants) return error('정원이 초과되었습니다');
    if (parseFloat(user.manner_score) < 30) return error('매너 점수가 부족하여 참여할 수 없습니다', 403);

    // 중복 신청 방지 (pending/joined 모두 확인)
    const { data: parts } = await supabaseAdmin
      .from('participations')
      .select('id, status')
      .eq('spot_id', params.id)
      .eq('user_id', user.id)
      .in('status', ['pending', 'joined']);

    const existing = parts?.[0];
    if (existing) {
      if (existing.status === 'pending') return error('이미 승인 대기 중입니다. 팀장의 승인을 기다려주세요.');
      if (existing.status === 'joined') return error('이미 참여 중인 스팟입니다');
    }

    // pending 상태로 신청 (참가자 수는 팀장 승인 후 증가)
    const { error: insertErr } = await supabaseAdmin.from('participations').insert({
      spot_id: params.id,
      user_id: user.id,
      status: 'pending',
    });

    if (insertErr) {
      console.error('[join] insert error:', insertErr.message, insertErr.code);
      // DB constraint에 pending이 없으면 joined로 fallback
      if (insertErr.code === '23514') {
        const { error: fallbackErr } = await supabaseAdmin.from('participations').insert({
          spot_id: params.id,
          user_id: user.id,
          status: 'joined',
        });
        if (fallbackErr) throw fallbackErr;
        const newCount = spot.current_participants + 1;
        await supabaseAdmin.from('spots').update({
          current_participants: newCount,
          status: newCount >= spot.max_participants ? 'full' : 'recruiting',
        }).eq('id', params.id);
        return ok({ status: 'joined', message: '참가가 완료되었습니다!' });
      }
      throw insertErr;
    }

    return ok({ status: 'pending', message: '신청이 완료되었습니다! 팀장의 승인을 기다려주세요.' });
  } catch (err) { return handleError(err); }
}

// DELETE /api/spots/:id/join — 참여 취소
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { data: spot } = await supabaseAdmin.from('spots').select('starts_at, current_participants, status').eq('id', params.id).single();
    if (!spot || new Date(spot.starts_at) <= new Date()) return error('이미 시작된 스팟은 취소할 수 없습니다');

    // pending이든 joined이든 모두 cancelled로
    const { data: parts } = await supabaseAdmin
      .from('participations')
      .select('id, status')
      .eq('spot_id', params.id)
      .eq('user_id', user.id)
      .in('status', ['pending', 'joined']);

    if (!parts || parts.length === 0) return error('참여 내역이 없습니다');

    for (const p of parts) {
      await supabaseAdmin.from('participations').update({ status: 'cancelled' }).eq('id', p.id);
    }

    // joined 상태였던 경우만 참가자 수 감소
    const wasJoined = parts.some(p => p.status === 'joined');
    if (wasJoined) {
      const newCount = Math.max(0, spot.current_participants - 1);
      await supabaseAdmin.from('spots').update({
        current_participants: newCount,
        status: spot.status === 'full' ? 'recruiting' : spot.status,
      }).eq('id', params.id);
    }

    return ok(null);
  } catch (err) { return handleError(err); }
}
