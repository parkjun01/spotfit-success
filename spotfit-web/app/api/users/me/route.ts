import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { data } = await supabaseAdmin
      .from('users')
      .select(`*, user_sports(sports(id,name)), user_badges(badges(id,name,image_url))`)
      .eq('id', user.id).single();
    return ok(data);
  } catch (err) { return handleError(err); }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { nickname, activityRegion, profileImage, preferredSports } = await req.json();

    if (nickname) {
      const { data: check } = await supabaseAdmin.from('users').select('id').eq('nickname', nickname).neq('id', user.id).single();
      if (check) return error('이미 사용 중인 닉네임입니다', 409);
    }

    const updates: Record<string, unknown> = {};
    if (nickname) updates.nickname = nickname;
    if (activityRegion) updates.activity_region = activityRegion;
    if (profileImage) updates.profile_image = profileImage;

    await supabaseAdmin.from('users').update(updates).eq('id', user.id);

    if (preferredSports) {
      await supabaseAdmin.from('user_sports').delete().eq('user_id', user.id);
      if (preferredSports.length) {
        await supabaseAdmin.from('user_sports').insert(
          preferredSports.map((sportId: string) => ({ user_id: user.id, sport_id: sportId }))
        );
      }
    }
    return ok(null);
  } catch (err) { return handleError(err); }
}
