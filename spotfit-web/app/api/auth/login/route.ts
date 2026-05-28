import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signTokens } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username?.trim()) return error('아이디를 입력해주세요');
    if (!password) return error('비밀번호를 입력해주세요');

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .eq('is_active', true)
      .single();

    if (!user) return error('아이디 또는 비밀번호가 올바르지 않습니다', 401);

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return error('아이디 또는 비밀번호가 올바르지 않습니다', 401);

    const tokens = signTokens(user.id);
    return ok({
      user: {
        id: user.id,
        nickname: user.nickname,
        username: user.username,
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
