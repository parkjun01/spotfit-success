import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

// GET /api/spots/:id
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error: err } = await supabaseAdmin
      .from('spots')
      .select(`
        *,
        sports(name, category),
        users!host_id(nickname, manner_score, profile_image),
        spot_tags(tags(id, name)),
        participations(user_id, status, users(id, nickname, manner_score, profile_image))
      `)
      .eq('id', params.id)
      .single();
    if (err || !data) return error('스팟을 찾을 수 없습니다', 404);
    return ok(data);
  } catch (err) { return handleError(err); }
}

// PATCH /api/spots/:id
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { data: spot } = await supabaseAdmin.from('spots').select('*').eq('id', params.id).eq('host_id', user.id).single();
    if (!spot) return error('스팟을 찾을 수 없거나 권한이 없습니다', 404);
    if (spot.status !== 'recruiting') return error('모집 중인 스팟만 수정할 수 있습니다');

    const body = await req.json();
    const { title, description, maxParticipants, difficultyLevel, startsAt } = body;
    const updates: Record<string, unknown> = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (maxParticipants) updates.max_participants = maxParticipants;
    if (difficultyLevel) updates.difficulty_level = difficultyLevel;
    if (startsAt) updates.starts_at = startsAt;

    await supabaseAdmin.from('spots').update(updates).eq('id', params.id);
    return ok(null);
  } catch (err) { return handleError(err); }
}

// DELETE /api/spots/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { data: spot } = await supabaseAdmin.from('spots').select('*').eq('id', params.id).eq('host_id', user.id).single();
    if (!spot) return error('스팟을 찾을 수 없거나 권한이 없습니다', 404);
    if (['completed', 'cancelled'].includes(spot.status)) return error('이미 종료/취소된 스팟입니다');

    await supabaseAdmin.from('spots').update({ status: 'cancelled' }).eq('id', params.id);
    return ok(null);
  } catch (err) { return handleError(err); }
}
