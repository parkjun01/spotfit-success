'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm] = useState({
    username: '', password: '', passwordConfirm: '',
    nickname: '', activityRegion: '',
  });

  const saveAndRedirect = (data: any) => {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('user', JSON.stringify(data.user));
    router.push('/');
  };

  const handleLogin = async () => {
    if (!loginForm.username.trim()) return setError('아이디를 입력해주세요');
    if (!loginForm.password) return setError('비밀번호를 입력해주세요');
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginForm.username.trim(), password: loginForm.password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '로그인 실패');
      saveAndRedirect(data.data);
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!regForm.username.trim()) return setError('아이디를 입력해주세요');
    if (regForm.password !== regForm.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
    if (!regForm.nickname.trim()) return setError('닉네임을 입력해주세요');
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regForm.username.trim(),
          password: regForm.password,
          nickname: regForm.nickname.trim(),
          activityRegion: regForm.activityRegion.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '회원가입 실패');
      saveAndRedirect(data.data);
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-primary mb-2">SpotFit</div>
          <p className="text-gray-500 text-sm">위치 기반 운동 파티 매칭</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* 탭 */}
          <div className="flex border-b border-gray-100">
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                  tab === t ? 'text-primary border-b-2 border-primary' : 'text-gray-400'
                }`}
              >
                {t === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'login' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">아이디</label>
                  <input
                    className="input w-full"
                    placeholder="아이디 입력"
                    value={loginForm.username}
                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">비밀번호</label>
                  <input
                    className="input w-full"
                    type="password"
                    placeholder="비밀번호 입력"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    autoComplete="current-password"
                  />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button className="btn-primary w-full" onClick={handleLogin} disabled={loading}>
                  {loading ? '로그인 중...' : '로그인'}
                </button>
                <p className="text-center text-xs text-gray-400 pt-1">
                  계정이 없으신가요?{' '}
                  <button onClick={() => { setTab('register'); setError(''); }} className="text-primary font-semibold">
                    회원가입
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    아이디 <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="input w-full"
                    placeholder="영문·숫자·밑줄, 4~20자"
                    value={regForm.username}
                    onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                    autoComplete="username"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    비밀번호 <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="input w-full"
                    type="password"
                    placeholder="6자 이상"
                    value={regForm.password}
                    onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    비밀번호 확인 <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="input w-full"
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={regForm.passwordConfirm}
                    onChange={e => setRegForm(f => ({ ...f, passwordConfirm: e.target.value }))}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    닉네임 <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="input w-full"
                    placeholder="2~10자"
                    value={regForm.nickname}
                    onChange={e => setRegForm(f => ({ ...f, nickname: e.target.value }))}
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    활동 지역 <span className="text-gray-400">(선택)</span>
                  </label>
                  <input
                    className="input w-full"
                    placeholder="예: 서울 강남구"
                    value={regForm.activityRegion}
                    onChange={e => setRegForm(f => ({ ...f, activityRegion: e.target.value }))}
                  />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button className="btn-primary w-full" onClick={handleRegister} disabled={loading}>
                  {loading ? '가입 중...' : '회원가입'}
                </button>
                <p className="text-center text-xs text-gray-400 pt-1">
                  이미 계정이 있으신가요?{' '}
                  <button onClick={() => { setTab('login'); setError(''); }} className="text-primary font-semibold">
                    로그인
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          가입 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </p>
      </div>
    </div>
  );
}
