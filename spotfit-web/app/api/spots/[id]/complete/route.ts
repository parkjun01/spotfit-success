import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { data: spot } = await supabaseAdmin
      .from('spots')
      .select('host_id, status')
      .eq('id', params.id)
      .single();

    if (!spot) return error('스팟을 찾을 수 없습니다', 404);
    if (spot.host_id !== user.id) return error('호스트만 종료할 수 있습니다', 403);
    if (['completed', 'cancelled'].includes(spot.status)) return error('이미 종료된 스팟입니다');

    await supabaseAdmin.from('spots').update({ status: 'completed' }).eq('id', params.id);
    // 대기 중인 신청은 취소 처리
    await supabaseAdmin
      .from('participations')
      .update({ status: 'cancelled' })
      .eq('spot_id', params.id)
      .eq('status', 'pending');

    return ok(null);
  } catch (err) { return handleError(err); }
}
