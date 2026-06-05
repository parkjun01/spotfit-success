import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, created, handleError } from '@/lib/response';

// GET /api/spots/:id/messages — 메시지 목록 조회
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const after = req.nextUrl.searchParams.get('after'); // 이 timestamp 이후 메시지만
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('chat_messages')
      .select('id, user_id, message, message_type, created_at, users(nickname, profile_image)')
      .eq('spot_id', params.id)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (after) query = query.gt('created_at', after);

    const { data, error: err } = await query;
    if (err) throw err;
    return ok(data || []);
  } catch (err) { return handleError(err); }
}

// POST /api/spots/:id/messages — 메시지 전송
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const { message, message_type = 'text' } = await req.json();

    if (!message?.trim()) return error('메시지를 입력해주세요');

    // 승인된 참여자만 메시지 전송 가능
    const { data: part } = await supabaseAdmin
      .from('participations')
      .select('id, status')
      .eq('spot_id', params.id)
      .eq('user_id', user.id)
      .single();
    if (!part) return error('채팅방에 참여한 사용자만 메시지를 보낼 수 있습니다', 403);
    if (part.status === 'pending') return error('호스트 승인 후 채팅에 참여할 수 있습니다', 403);

    const { data, error: err } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        spot_id: params.id,
        user_id: user.id,
        message: message.trim(),
        message_type,
      })
      .select('id, user_id, message, message_type, created_at, users(nickname, profile_image)')
      .single();

    if (err) throw err;
    return created(data);
  } catch (err) { return handleError(err); }
}
