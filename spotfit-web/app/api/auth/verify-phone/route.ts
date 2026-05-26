import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signTokens } from '@/lib/auth';
import { hash } from '@/lib/crypto';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { phoneToken, nickname, preferredSports = [], activityRegion } = await req.json();
    if (!phoneToken) return error('인증 토큰이 필요합니다');

    // 실제: PASS API로 검증 후 전화번호 추출
    const phoneHash = hash(phoneToken);

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone_hash', phoneHash)
      .single();

    let user = existingUser;

    if (!user) {
      if (!nickname) return error('닉네임이 필요합니다');
      const { data: nicknameCheck } = await supabaseAdmin
        .from('users').select('id').eq('nickname', nickname).single();
      if (nicknameCheck) return error('이미 사용 중인 닉네임입니다', 409);

      const { data: newUser, error: insertErr } = await supabaseAdmin
        .from('users')
        .insert({ phone_hash: phoneHash, nickname, activity_region: activityRegion })
        .select()
        .single();
      if (insertErr) throw insertErr;
      user = newUser;

      if (preferredSports.length) {
        await supabaseAdmin.from('user_sports').insert(
          preferredSports.map((sportId: string) => ({ user_id: user.id, sport_id: sportId }))
        );
      }
    }

    const tokens = signTokens(user.id);
    return ok({ user: sanitize(user), ...tokens });
  } catch (err) {
    return handleError(err);
  }
}

const sanitize = (u: any) => ({
  id: u.id, nickname: u.nickname, profileImage: u.profile_image,
  activityRegion: u.activity_region, mannerScore: u.manner_score,
  subscriptionStatus: u.subscription_status,
});
