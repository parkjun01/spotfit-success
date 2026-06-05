import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

// PATCH: 호스트가 대기 중인 참가 신청을 승인/거절
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { userId, action } = await req.json() as { userId: string; action: 'approve' | 'reject' };

    const { data: spot } = await supabaseAdmin
      .from('spots')
      .select('host_id, status, current_participants, max_participants')
      .eq('id', params.id)
      .single();

    if (!spot) return error('스팟을 찾을 수 없습니다', 404);
    if (spot.host_id !== user.id) return error('호스트만 승인/거절할 수 있습니다', 403);
    if (!['recruiting', 'full'].includes(spot.status)) return error('모집 중인 스팟만 관리할 수 있습니다');

    const { data: part } = await supabaseAdmin
      .from('participations')
      .select('id, status')
      .eq('spot_id', params.id)
      .eq('user_id', userId)
      .single();

    if (!part || part.status !== 'pending') return error('대기 중인 신청이 없습니다');

    if (action === 'approve') {
      if (spot.current_participants >= spot.max_participants) return error('정원이 초과되었습니다');
      await supabaseAdmin.from('participations').update({ status: 'joined' }).eq('id', part.id);
      const newCount = spot.current_participants + 1;
      await supabaseAdmin.from('spots').update({
        current_participants: newCount,
        status: newCount >= spot.max_participants ? 'full' : 'recruiting',
      }).eq('id', params.id);
      return ok({ action: 'approved', currentParticipants: newCount });
    }

    await supabaseAdmin.from('participations').update({ status: 'cancelled' }).eq('id', part.id);
    return ok({ action: 'rejected' });
  } catch (err) { return handleError(err); }
}
