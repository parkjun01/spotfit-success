import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, error, handleError } from '@/lib/response';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email: string, otp: string, nickname: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY가 설정되지 않았습니다');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-family:Arial,sans-serif;font-size:36px;font-weight:900;color:#c9f236;letter-spacing:2px;margin:0;">SPOTFIT</h1>
      <p style="color:#8A8A9A;font-size:13px;margin:4px 0 0;">위치 기반 운동 파티 매칭</p>
    </div>
    <div style="background:#141416;border:1px solid #2A2A32;border-radius:16px;padding:32px;">
      <h2 style="color:#e5e2e3;font-size:20px;margin:0 0 8px;">이메일 인증</h2>
      <p style="color:#8A8A9A;font-size:14px;margin:0 0 28px;line-height:1.6;">
        안녕하세요, <strong style="color:#c9f236">${nickname}</strong>님!<br>
        아래 6자리 인증 코드를 입력해 이메일을 인증해주세요.
      </p>
      <div style="background:#1E1E22;border:2px solid rgba(201,242,54,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <p style="color:#8A8A9A;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">인증 코드</p>
        <p style="color:#c9f236;font-size:40px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace;">${otp}</p>
        <p style="color:#3E3E4A;font-size:12px;margin:12px 0 0;">10분 후 만료됩니다</p>
      </div>
      <p style="color:#3E3E4A;font-size:12px;margin:0;line-height:1.6;">
        이 이메일을 요청하지 않았다면 무시해도 됩니다.<br>
        SpotFit 계정 보안팀
      </p>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SpotFit <noreply@spotfit.app>',
      to: [email],
      subject: `[SpotFit] 이메일 인증 코드: ${otp}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || '이메일 전송 실패');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json();
    if (!email?.trim()) return error('이메일을 입력해주세요');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('올바른 이메일 형식이 아닙니다');

    // 이미 다른 계정에서 사용 중인 이메일인지 확인
    if (userId) {
      const { data: existing } = await supabaseAdmin
        .from('users').select('id').eq('email', email.toLowerCase()).neq('id', userId).single();
      if (existing) return error('이미 사용 중인 이메일입니다', 409);
    }

    // 기존 미사용 OTP 만료 처리
    await supabaseAdmin.from('email_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase())
      .eq('used', false);

    // 새 OTP 생성
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분

    await supabaseAdmin.from('email_otps').insert({
      email: email.toLowerCase(),
      user_id: userId || null,
      otp,
      expires_at: expiresAt,
    });

    // 유저 닉네임 조회
    let nickname = '회원';
    if (userId) {
      const { data: user } = await supabaseAdmin.from('users').select('nickname').eq('id', userId).single();
      if (user) nickname = user.nickname;
    }

    await sendVerificationEmail(email.toLowerCase(), otp, nickname);

    return ok({ message: '인증 코드가 이메일로 전송되었습니다' });
  } catch (err) { return handleError(err); }
}
