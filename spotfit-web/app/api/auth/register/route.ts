import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { signTokens } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password, nickname, email, activityRegion, gender, age, preferredSports = [], homeLat, homeLng } = await req.json();

    if (!username?.trim()) return error('아이디를 입력해주세요');
    if (username.length < 4 || username.length > 20) return error('아이디는 4~20자여야 합니다');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return error('아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다');
    if (!password) return error('비밀번호를 입력해주세요');
    if (password.length < 6) return error('비밀번호는 6자 이상이어야 합니다');
    if (!nickname?.trim()) return error('닉네임을 입력해주세요');
    if (nickname.length < 2 || nickname.length > 10) return error('닉네임은 2~10자여야 합니다');
    if (!email?.trim()) return error('이메일을 입력해주세요');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('올바른 이메일 형식이 아닙니다');

    const { data: existingUsername } = await supabaseAdmin
      .from('users').select('id').eq('username', username.trim()).single();
    if (existingUsername) return error('이미 사용 중인 아이디입니다', 409);

    const { data: existingNickname } = await supabaseAdmin
      .from('users').select('id').eq('nickname', nickname.trim()).single();
    if (existingNickname) return error('이미 사용 중인 닉네임입니다', 409);

    const { data: existingEmail } = await supabaseAdmin
      .from('users').select('id').eq('email', email.toLowerCase().trim()).single();
    if (existingEmail) return error('이미 사용 중인 이메일입니다', 409);

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({
        username: username.trim(),
        password_hash: passwordHash,
        nickname: nickname.trim(),
        email: email.toLowerCase().trim(),
        email_verified: false,
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

    // 이메일 인증 OTP 생성 및 발송
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabaseAdmin.from('email_otps').insert({
      email: email.toLowerCase().trim(),
      user_id: newUser.id,
      otp,
      expires_at: expiresAt,
    });

    if (process.env.RESEND_API_KEY) {
      const emailHtml = `<div style="font-family:Arial;background:#0A0A0B;padding:32px;color:#e5e2e3;max-width:480px;margin:0 auto;border-radius:16px;border:1px solid #2A2A32"><h1 style="color:#c9f236;letter-spacing:2px">SPOTFIT</h1><p>안녕하세요, <strong style="color:#c9f236">${nickname}</strong>님!</p><p>아래 6자리 코드로 이메일을 인증해주세요:</p><div style="background:#1E1E22;border:2px solid rgba(201,242,54,0.3);border-radius:12px;padding:24px;text-align:center;margin:20px 0"><p style="color:#c9f236;font-size:40px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace">${otp}</p><p style="color:#8A8A9A;font-size:12px;margin:8px 0 0">10분 후 만료됩니다</p></div></div>`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'SpotFit <noreply@spotfit.app>', to: [email.toLowerCase().trim()], subject: `[SpotFit] 이메일 인증 코드: ${otp}`, html: emailHtml }),
      }).catch(() => {});
    }

    return ok({
      needsVerification: true,
      email: email.toLowerCase().trim(),
      userId: newUser.id,
    });
  } catch (err) {
    return handleError(err);
  }
}
