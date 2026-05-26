import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, error, handleError } from '@/lib/response';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error: err } = await supabaseAdmin
      .from('users')
      .select('id, nickname, profile_image, manner_score, activity_region, subscription_status, created_at, user_badges(badges(name, description, image_url), earned_at), user_sports(sports(name))')
      .eq('id', params.id)
      .eq('is_active', true)
      .single();
    if (err || !data) return error('사용자를 찾을 수 없습니다', 404);
    return ok(data);
  } catch (err) { return handleError(err); }
}
