import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

// POST /api/spots/:id/join
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);

    const { data: spot } = await supabaseAdmin.from('spots').select('*').eq('id', params.id).single();
    if (!spot) return error('스팟을 찾을 수 없습니다', 404);
    if (spot.status !== 'recruiting') return error('참여할 수 없는 스팟입니다');
    if (spot.current_participants >= spot.max_participants) return error('정원이 초과되었습니다');
    if (parseFloat(user.manner_score) < 30) return error('매너 점수가 부족하여 참여할 수 없습니다', 403);

    // 중복 참여 방지
    const { data: existing } = await supabaseAdmin
      .from('participations').select('id').eq('spot_id', params.id).eq('user_id', user.id).single();
    if (existing) return error('이미 참여 중인 스팟입니다');

    await supabaseAdmin.from('participations').insert({ spot_id: params.id, user_id: user.id, status: 'joined' });

    const newCount = spot.current_participants + 1;
    const newStatus = newCount >= spot.max_participants ? 'full' : 'recruiting';
    await supabaseAdmin.from('spots').update({ current_participants: newCount, status: newStatus }).eq('id', params.id);

    return ok({ currentParticipants: newCount, status: newStatus });
  } catch (err) { return handleError(err); }
}

// DELETE /api/spots/:id/join
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { data: spot } = await supabaseAdmin.from('spots').select('starts_at, current_participants, status').eq('id', params.id).single();
    if (!spot || new Date(spot.starts_at) <= new Date()) return error('이미 시작된 스팟은 취소할 수 없습니다');

    await supabaseAdmin.from('participations').update({ status: 'cancelled' }).eq('spot_id', params.id).eq('user_id', user.id);
    const newCount = Math.max(0, spot.current_participants - 1);
    await supabaseAdmin.from('spots').update({
      current_participants: newCount,
      status: spot.status === 'full' ? 'recruiting' : spot.status,
    }).eq('id', params.id);

    return ok(null);
  } catch (err) { return handleError(err); }
}
