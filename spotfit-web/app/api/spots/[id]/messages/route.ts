import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, created, handleError } from '@/lib/response';

// GET /api/spots/:id/messages — 메시지 목록 조회
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const after = req.nextUrl.searchParams.get('after');
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

    // 호스트 확인 (팀장은 항상 채팅 가능)
    const { data: spot } = await supabaseAdmin
      .from('spots')
      .select('host_id')
      .eq('id', params.id)
      .single();

    const isHost = spot?.host_id === user.id;

    if (!isHost) {
      // 가장 최신 참여 상태 확인 (중복 레코드 edge case 대비: limit 1)
      const { data: parts } = await supabaseAdmin
        .from('participations')
        .select('id, status')
        .eq('spot_id', params.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const part = parts?.[0];
      if (!part) return error('스팟에 참여하지 않은 사용자입니다', 403);
      if (part.status === 'pending') return error('호스트의 승인을 기다리는 중입니다. 승인 후 채팅에 참여할 수 있습니다.', 403);
      if (part.status !== 'joined') return error('참여 승인된 사용자만 메시지를 보낼 수 있습니다', 403);
    }

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
