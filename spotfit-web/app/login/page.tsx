'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'nickname'>('phone');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [activityRegion, setActivityRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneSubmit = async () => {
    if (!phone.trim()) return setError('전화번호를 입력해주세요');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '오류가 발생했습니다');

      if (data.data?.isNewUser) {
        setStep('nickname');
      } else {
        saveAndRedirect(data.data);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameSubmit = async () => {
    if (!nickname.trim()) return setError('닉네임을 입력해주세요');
    if (nickname.length < 2 || nickname.length > 10) return setError('닉네임은 2~10자 사이여야 합니다');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), nickname: nickname.trim(), activityRegion }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '오류가 발생했습니다');
      saveAndRedirect(data.data);
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const saveAndRedirect = (data: any) => {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-primary mb-2">SpotFit</div>
          <p className="text-gray-500 text-sm">위치 기반 운동 파티 매칭</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {step === 'phone' ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-1">전화번호로 시작하기</h2>
              <p className="text-sm text-gray-500 mb-5">전화번호를 입력하면 자동으로 가입됩니다</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">전화번호</label>
                  <input
                    className="input w-full"
                    type="tel"
                    placeholder="010-0000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                    maxLength={13}
                  />
                </div>

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                  className="btn-primary w-full"
                  onClick={handlePhoneSubmit}
                  disabled={loading}
                >
                  {loading ? '확인 중...' : '계속하기'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setStep('phone')} className="text-gray-400 text-sm mb-4 flex items-center gap-1">
                ← 뒤로
              </button>
              <h2 className="text-lg font-bold text-gray-900 mb-1">프로필 설정</h2>
              <p className="text-sm text-gray-500 mb-5">처음 오셨군요! 닉네임을 설정해주세요</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">닉네임 <span className="text-red-400">*</span></label>
                  <input
                    className="input w-full"
                    placeholder="2~10자 닉네임"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">활동 지역 <span className="text-gray-400">(선택)</span></label>
                  <input
                    className="input w-full"
                    placeholder="예: 서울 강남구"
                    value={activityRegion}
                    onChange={e => setActivityRegion(e.target.value)}
                  />
                </div>

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                  className="btn-primary w-full"
                  onClick={handleNicknameSubmit}
                  disabled={loading}
                >
                  {loading ? '가입 중...' : '시작하기'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          가입 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </p>
      </div>
    </div>
  );
}
