import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signTokens } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return error('이메일과 인증 코드를 입력해주세요');

    // OTP 조회
    const { data: record } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('otp', otp.trim())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!record) return error('인증 코드가 올바르지 않거나 만료되었습니다', 400);

    // OTP 사용 처리
    await supabaseAdmin.from('email_otps').update({ used: true }).eq('id', record.id);

    // 유저 이메일 인증 완료 처리
    let userId = record.user_id;

    if (userId) {
      await supabaseAdmin.from('users').update({
        email: email.toLowerCase(),
        email_verified: true,
      }).eq('id', userId);
    } else {
      // user_id 없는 경우 이메일로 유저 찾기
      const { data: user } = await supabaseAdmin
        .from('users').select('id').eq('email', email.toLowerCase()).single();
      if (!user) return error('유저를 찾을 수 없습니다', 404);
      userId = user.id;
      await supabaseAdmin.from('users').update({ email_verified: true }).eq('id', userId);
    }

    // 인증 완료 후 자동 로그인 토큰 발급
    const tokens = signTokens(userId);
    const { data: user } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();

    return ok({
      user: {
        id: user.id,
        nickname: user.nickname,
        username: user.username,
        profileImage: user.profile_image,
        mannerScore: user.manner_score,
        subscriptionStatus: user.subscription_status,
        homeLat: user.home_lat,
        homeLng: user.home_lng,
        emailVerified: true,
      },
      ...tokens,
    });
  } catch (err) { return handleError(err); }
}
