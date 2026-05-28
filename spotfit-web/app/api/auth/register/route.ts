import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signTokens } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password, nickname, activityRegion, gender, age, preferredSports = [], homeLat, homeLng } = await req.json();

    if (!username?.trim()) return error('아이디를 입력해주세요');
    if (username.length < 4 || username.length > 20) return error('아이디는 4~20자여야 합니다');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return error('아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다');
    if (!password) return error('비밀번호를 입력해주세요');
    if (password.length < 6) return error('비밀번호는 6자 이상이어야 합니다');
    if (!nickname?.trim()) return error('닉네임을 입력해주세요');
    if (nickname.length < 2 || nickname.length > 10) return error('닉네임은 2~10자여야 합니다');

    const { data: existingUsername } = await supabaseAdmin
      .from('users').select('id').eq('username', username.trim()).single();
    if (existingUsername) return error('이미 사용 중인 아이디입니다', 409);

    const { data: existingNickname } = await supabaseAdmin
      .from('users').select('id').eq('nickname', nickname.trim()).single();
    if (existingNickname) return error('이미 사용 중인 닉네임입니다', 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({
        username: username.trim(),
        password_hash: passwordHash,
        nickname: nickname.trim(),
        activity_region: activityRegion || null,
        gender: gender || null,
        age: age ? parseInt(age) : null,
        home_lat: homeLat || null,
        home_lng: homeLng || null,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    if (preferredSports.length > 0) {
      await supabaseAdmin.from('user_sports').insert(
        preferredSports.map((sportId: string) => ({ user_id: newUser.id, sport_id: sportId }))
      );
    }

    const tokens = signTokens(newUser.id);
    return ok({
      user: {
        id: newUser.id,
        nickname: newUser.nickname,
        username: newUser.username,
        profileImage: newUser.profile_image,
        mannerScore: newUser.manner_score,
        subscriptionStatus: newUser.subscription_status,
        homeLat: newUser.home_lat,
        homeLng: newUser.home_lng,
      },
      ...tokens,
    });
  } catch (err) {
    return handleError(err);
  }
}
