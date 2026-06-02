'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') || '';
  const userId = params.get('userId') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) { router.push('/login'); return; }
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleInput = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every(d => d !== '') && next.join('').length === 6) {
      verifyCode(next.join(''));
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      verifyCode(text);
    }
  };

  const verifyCode = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || '인증 실패');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }
      setSuccess(true);
      // 자동 로그인
      localStorage.setItem('access_token', data.data.access);
      localStorage.setItem('refresh_token', data.data.refresh);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setTimeout(() => router.push('/'), 1500);
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId }),
      });
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      setError('재전송 실패. 다시 시도해주세요');
    } finally {
      setResending(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, color: '#c9f236', letterSpacing: '0.05em', lineHeight: 1, margin: 0 }}>SPOTFIT</p>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginTop: 6 }}>이메일 인증</p>
      </div>

      <div style={{ width: '100%', maxWidth: 390, background: '#141416', border: '1px solid #2A2A32', borderRadius: 20, padding: 28 }}>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', margin: '0 0 8px' }}>인증 완료!</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8A8A9A', lineHeight: 1.6 }}>이메일이 인증되었습니다.<br/>잠시 후 홈으로 이동합니다...</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, background: 'rgba(201,242,54,0.1)', border: '1px solid rgba(201,242,54,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>📧</div>
              <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#e5e2e3', margin: '0 0 8px' }}>코드를 입력해주세요</h2>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A', margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: '#c9f236' }}>{email}</strong>으로<br/>6자리 인증 코드를 발송했습니다.
              </p>
            </div>

            {/* OTP 입력창 */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 46, height: 56, textAlign: 'center',
                    fontFamily: 'Bebas Neue, sans-serif', fontSize: 28,
                    background: digit ? 'rgba(201,242,54,0.08)' : '#1E1E22',
                    border: `2px solid ${digit ? '#c9f236' : '#2A2A32'}`,
                    borderRadius: 12, color: '#c9f236', outline: 'none',
                    transition: 'all 0.15s',
                  }}
                  disabled={loading || success}
                />
              ))}
            </div>

            {error && (
              <p style={{ color: '#EF4444', fontSize: 13, fontFamily: 'DM Sans, sans-serif', textAlign: 'center', marginBottom: 16 }}>{error}</p>
            )}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 24, height: 24, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}

            {/* 재전송 */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {countdown > 0 ? (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3E3E4A' }}>
                  {countdown}초 후 재전송 가능
                </p>
              ) : (
                <button onClick={resendCode} disabled={resending} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#c9f236', textTransform: 'uppercase' }}>
                  {resending ? '전송 중...' : '코드 재전송'}
                </button>
              )}
            </div>

            <button
              onClick={() => { const code = otp.join(''); if (code.length === 6) verifyCode(code); }}
              disabled={otp.join('').length !== 6 || loading}
              style={{ width: '100%', height: 50, background: otp.join('').length === 6 ? '#c9f236' : '#1E1E22', color: otp.join('').length === 6 ? '#171e00' : '#3E3E4A', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: `1px solid ${otp.join('').length === 6 ? '#c9f236' : '#2A2A32'}`, borderRadius: 10, cursor: otp.join('').length === 6 ? 'pointer' : 'default', transition: 'all 0.2s', marginBottom: 12 }}
            >
              {loading ? '인증 중...' : '인증 완료'}
            </button>

            <button onClick={() => router.push('/login')} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A' }}>
              ← 로그인 페이지로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
