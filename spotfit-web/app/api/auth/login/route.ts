import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signTokens } from '@/lib/auth';
import { hash } from '@/lib/crypto';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { phone, nickname, preferredSports = [], activityRegion } = await req.json();
    if (!phone) return error('전화번호를 입력해주세요');

    const phoneHash = hash(phone);

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone_hash', phoneHash)
      .eq('is_active', true)
      .single();

    let user = existingUser;

    if (!user) {
      if (!nickname) return ok({ isNewUser: true });

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
    return ok({
      isNewUser: false,
      user: {
        id: user.id, nickname: user.nickname,
        profileImage: user.profile_image,
        mannerScore: user.manner_score,
        subscriptionStatus: user.subscription_status,
      },
      ...tokens,
    });
  } catch (err) {
    return handleError(err);
  }
}
