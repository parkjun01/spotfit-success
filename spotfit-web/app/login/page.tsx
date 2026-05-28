'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddressSearch from '@/components/AddressSearch';

interface Sport { id: string; name: string; }

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [sports, setSports] = useState<Sport[]>([]);

  // 로그인 폼
  const [loginForm, setLoginForm] = useState({ username: '', password: '', autoLogin: true });

  // 회원가입 폼
  const [regForm, setRegForm] = useState({
    username: '', password: '', passwordConfirm: '',
    nickname: '', gender: '', age: '',
    activityRegion: '', preferredSports: [] as string[],
  });

  useEffect(() => {
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
    // 자동 로그인 체크
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) router.push('/');
  }, []);

  const saveAndRedirect = (data: any, autoLogin: boolean) => {
    const storage = autoLogin ? localStorage : sessionStorage;
    if (!autoLogin) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    storage.setItem('access_token', data.access);
    storage.setItem('refresh_token', data.refresh);
    storage.setItem('user', JSON.stringify(data.user));
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
      saveAndRedirect(data.data, loginForm.autoLogin);
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setLoading(false); }
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!regForm.username.trim()) return setError('아이디를 입력해주세요');
      if (regForm.username.length < 4 || regForm.username.length > 20) return setError('아이디는 4~20자여야 합니다');
      if (!/^[a-zA-Z0-9_]+$/.test(regForm.username)) return setError('영문, 숫자, 밑줄(_)만 사용 가능합니다');
      if (!regForm.password) return setError('비밀번호를 입력해주세요');
      if (regForm.password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다');
      if (regForm.password !== regForm.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
    }
    if (step === 2) {
      if (!regForm.nickname.trim()) return setError('닉네임을 입력해주세요');
      if (regForm.nickname.length < 2 || regForm.nickname.length > 10) return setError('닉네임은 2~10자여야 합니다');
      if (!regForm.gender) return setError('성별을 선택해주세요');
      if (!regForm.age) return setError('나이를 입력해주세요');
    }
    setStep(s => s + 1);
  };

  const handleRegister = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regForm.username.trim(),
          password: regForm.password,
          nickname: regForm.nickname.trim(),
          gender: regForm.gender,
          age: regForm.age ? parseInt(regForm.age) : null,
          activityRegion: regForm.activityRegion || null,
          preferredSports: regForm.preferredSports,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '회원가입 실패');
      saveAndRedirect(data.data, true);
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setLoading(false); }
  };

  const toggleSport = (id: string) => {
    setRegForm(f => ({
      ...f,
      preferredSports: f.preferredSports.includes(id)
        ? f.preferredSports.filter(s => s !== id)
        : [...f.preferredSports, id],
    }));
  };

  const STEP_LABELS = ['계정 정보', '개인 정보', '선호 종목'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* 로고 */}
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
                onClick={() => { setTab(t); setStep(1); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-bold transition-colors ${
                  tab === t ? 'text-primary border-b-2 border-primary' : 'text-gray-400'
                }`}
              >
                {t === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          {tab === 'login' ? (
            /* ── 로그인 ── */
            <div className="p-6 space-y-3">
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
              {/* 자동 로그인 */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setLoginForm(f => ({ ...f, autoLogin: !f.autoLogin }))}
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                    loginForm.autoLogin ? 'bg-primary border-primary' : 'border-gray-300'
                  }`}
                >
                  {loginForm.autoLogin && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-sm text-gray-600">자동 로그인</span>
              </label>

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
            /* ── 회원가입 (3단계) ── */
            <div className="p-6">
              {/* 단계 표시 */}
              <div className="flex items-center justify-between mb-6">
                {STEP_LABELS.map((label, i) => (
                  <div key={i} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        i + 1 < step ? 'bg-primary text-white' :
                        i + 1 === step ? 'bg-primary text-white ring-4 ring-indigo-100' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {i + 1 < step ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs mt-1 ${i + 1 === step ? 'text-primary font-semibold' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    </div>
                    {i < 2 && <div className={`w-10 h-0.5 mx-1 mb-4 ${i + 1 < step ? 'bg-primary' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>

              {/* 1단계: 계정 정보 */}
              {step === 1 && (
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
                </div>
              )}

              {/* 2단계: 개인 정보 */}
              {step === 2 && (
                <div className="space-y-3">
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
                      성별 <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[['male', '남자'], ['female', '여자']].map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setRegForm(f => ({ ...f, gender: val }))}
                          className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                            regForm.gender === val
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      나이 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        className="input w-full pr-8"
                        type="number"
                        placeholder="나이 입력"
                        value={regForm.age}
                        min={10} max={100}
                        onChange={e => setRegForm(f => ({ ...f, age: e.target.value }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">세</span>
                    </div>
                  </div>
                  <AddressSearch
                    label="거주지"
                    value={regForm.activityRegion}
                    placeholder="주소 검색으로 거주지 등록"
                    onChange={result =>
                      setRegForm(f => ({ ...f, activityRegion: `${result.sido} ${result.sigungu}` }))
                    }
                  />
                </div>
              )}

              {/* 3단계: 선호 종목 */}
              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">관심 있는 종목을 선택해주세요 (복수 선택 가능)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {sports.map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleSport(s.id)}
                        className={`py-2.5 px-2 rounded-xl text-sm font-medium border-2 transition-colors ${
                          regForm.preferredSports.includes(s.id)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                  {regForm.preferredSports.length > 0 && (
                    <p className="text-xs text-primary font-medium">
                      {regForm.preferredSports.length}개 선택됨
                    </p>
                  )}
                </div>
              )}

              {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

              {/* 버튼 */}
              <div className="flex gap-2 mt-5">
                {step > 1 && (
                  <button
                    onClick={() => { setStep(s => s - 1); setError(''); }}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold"
                  >
                    이전
                  </button>
                )}
                {step < 3 ? (
                  <button onClick={nextStep} className="btn-primary flex-1">
                    다음
                  </button>
                ) : (
                  <button onClick={handleRegister} className="btn-primary flex-1" disabled={loading}>
                    {loading ? '가입 중...' : '가입 완료'}
                  </button>
                )}
              </div>

              <p className="text-center text-xs text-gray-400 pt-3">
                이미 계정이 있으신가요?{' '}
                <button onClick={() => { setTab('login'); setStep(1); setError(''); }} className="text-primary font-semibold">
                  로그인
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          가입 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </p>
      </div>
    </div>
  );
}
