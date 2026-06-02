'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AddressSearch from '@/components/AddressSearch';

interface Sport { id: string; name: string; }

const D = {
  page: { minHeight: '100vh', background: '#0A0A0B', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '32px 16px' },
  card: { width: '100%', maxWidth: 390, background: '#141416', border: '1px solid #2A2A32', borderRadius: 20, overflow: 'hidden' },
  label: { fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' },
  input: { width: '100%', background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 10, padding: '12px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const },
  btn: { width: '100%', height: 50, background: '#c9f236', color: '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' },
  btnDisabled: { opacity: 0.5, cursor: 'default' },
};

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', autoLogin: true });
  const [regForm, setRegForm] = useState({
    username: '', password: '', passwordConfirm: '', email: '',
    nickname: '', gender: '', age: '',
    activityRegion: '', addressDetail: '', homeLat: 0, homeLng: 0,
    preferredSports: [] as string[],
  });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) router.push('/');
  }, []);

  const saveAndRedirect = (data: any, autoLogin: boolean) => {
    const storage = autoLogin ? localStorage : sessionStorage;
    if (!autoLogin) { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('user'); }
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
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loginForm.username.trim(), password: loginForm.password }) });
      const data = await res.json();
      if (res.status === 403 && data.message?.includes('이메일 인증')) {
        // 이메일 미인증 → 인증 페이지로 이동 (이메일 다시 발송)
        const userRes = await fetch(`/api/auth/check-username/${encodeURIComponent(loginForm.username.trim())}`);
        setError('이메일 인증이 필요합니다. 가입 시 사용한 이메일을 확인해주세요.');
        return;
      }
      if (!res.ok) return setError(data.message || '로그인 실패');
      saveAndRedirect(data.data, loginForm.autoLogin);
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setLoading(false); }
  };

  const checkUsername = (value: string) => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!value || value.length < 4 || !/^[a-zA-Z0-9_]+$/.test(value)) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username/${encodeURIComponent(value)}`);
        const data = await res.json();
        setUsernameStatus(data.data?.available ? 'available' : 'taken');
      } catch { setUsernameStatus('idle'); }
    }, 500);
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!regForm.username.trim()) return setError('아이디를 입력해주세요');
      if (regForm.username.length < 4 || regForm.username.length > 20) return setError('아이디는 4~20자여야 합니다');
      if (!/^[a-zA-Z0-9_]+$/.test(regForm.username)) return setError('영문, 숫자, 밑줄(_)만 사용 가능합니다');
      if (usernameStatus === 'taken') return setError('이미 사용 중인 아이디입니다');
      if (usernameStatus === 'checking') return setError('아이디 중복 확인 중입니다. 잠시 후 다시 시도해주세요');
      if (!regForm.password) return setError('비밀번호를 입력해주세요');
      if (regForm.password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다');
      if (regForm.password !== regForm.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
      if (!regForm.email.trim()) return setError('이메일을 입력해주세요');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) return setError('올바른 이메일 형식이 아닙니다');
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
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: regForm.username.trim(), password: regForm.password, email: regForm.email.trim(), nickname: regForm.nickname.trim(), gender: regForm.gender, age: regForm.age ? parseInt(regForm.age) : null, activityRegion: regForm.activityRegion ? regForm.activityRegion + (regForm.addressDetail ? ' ' + regForm.addressDetail : '') : null, homeLat: regForm.homeLat || null, homeLng: regForm.homeLng || null, preferredSports: regForm.preferredSports }) });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '회원가입 실패');
      // 이메일 인증 필요한 경우 → 인증 페이지로 이동
      if (data.data?.needsVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(data.data.email)}&userId=${data.data.userId}`);
        return;
      }
      saveAndRedirect(data.data, true);
    } catch { setError('네트워크 오류가 발생했습니다'); }
    finally { setLoading(false); }
  };

  const toggleSport = (id: string) => setRegForm(f => ({ ...f, preferredSports: f.preferredSports.includes(id) ? f.preferredSports.filter(s => s !== id) : [...f.preferredSports, id] }));

  return (
    <div style={D.page}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, color: '#c9f236', letterSpacing: '0.05em', lineHeight: 1 }}>SPOTFIT</p>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginTop: 6 }}>위치 기반 운동 파티 매칭</p>
      </div>

      <div style={D.card}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2A2A32' }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setStep(1); setError(''); }} style={{ flex: 1, padding: '14px 0', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#c9f236' : 'transparent'}`, color: tab === t ? '#c9f236' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s', marginBottom: -1 }}>
              {t === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={D.label}>아이디</label>
              <input style={D.input} placeholder="아이디 입력" value={loginForm.username} onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} onFocus={e => (e.target.style.borderColor = '#c9f236')} onBlur={e => (e.target.style.borderColor = '#2A2A32')} autoComplete="username" />
            </div>
            <div>
              <label style={D.label}>비밀번호</label>
              <input style={D.input} type="password" placeholder="비밀번호 입력" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} onFocus={e => (e.target.style.borderColor = '#c9f236')} onBlur={e => (e.target.style.borderColor = '#2A2A32')} autoComplete="current-password" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div onClick={() => setLoginForm(f => ({ ...f, autoLogin: !f.autoLogin }))} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${loginForm.autoLogin ? '#c9f236' : '#2A2A32'}`, background: loginForm.autoLogin ? '#c9f236' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                {loginForm.autoLogin && <span style={{ color: '#171e00', fontSize: 12, fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8A8A9A' }}>자동 로그인</span>
            </label>
            {error && <p style={{ color: '#EF4444', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>{error}</p>}
            <button style={{ ...D.btn, ...(loading ? D.btnDisabled : {}) }} onClick={handleLogin} disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
            <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A' }}>
              계정이 없으신가요?{' '}
              <button onClick={() => { setTab('register'); setError(''); }} style={{ color: '#c9f236', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>회원가입</button>
            </p>
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            {/* Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
              {['계정 정보', '개인 정보', '선호 종목'].map((label, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, background: i + 1 < step ? '#c9f236' : i + 1 === step ? '#c9f236' : '#1E1E22', color: i + 1 <= step ? '#171e00' : '#8A8A9A', border: i + 1 === step ? '3px solid rgba(201,242,54,0.3)' : 'none', boxSizing: 'border-box' as const }}>
                      {i + 1 < step ? '✓' : i + 1}
                    </div>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, color: i + 1 === step ? '#c9f236' : '#3E3E4A' }}>{label}</span>
                  </div>
                  {i < 2 && <div style={{ width: 32, height: 2, background: i + 1 < step ? '#c9f236' : '#2A2A32', margin: '0 4px', marginBottom: 16 }} />}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={D.label}>아이디 <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input style={{ ...D.input, paddingRight: 100, borderColor: usernameStatus === 'taken' ? '#EF4444' : usernameStatus === 'available' ? '#22C55E' : '#2A2A32' }} placeholder="영문·숫자·밑줄, 4~20자" value={regForm.username} onChange={e => { setRegForm(f => ({ ...f, username: e.target.value })); checkUsername(e.target.value); }} autoComplete="username" maxLength={20} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700 }}>
                      {usernameStatus === 'checking' && <span style={{ color: '#8A8A9A' }}>확인 중...</span>}
                      {usernameStatus === 'available' && <span style={{ color: '#22C55E' }}>✓ 사용 가능</span>}
                      {usernameStatus === 'taken' && <span style={{ color: '#EF4444' }}>✗ 이미 사용 중</span>}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#3E3E4A', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>영문, 숫자, 밑줄(_)만 사용 가능 · 4~20자</p>
                </div>
                <div>
                  <label style={D.label}>비밀번호 <span style={{ color: '#EF4444' }}>*</span></label>
                  <input style={D.input} type="password" placeholder="6자 이상" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} onFocus={e => (e.target.style.borderColor = '#c9f236')} onBlur={e => (e.target.style.borderColor = '#2A2A32')} autoComplete="new-password" />
                </div>
                <div>
                  <label style={D.label}>비밀번호 확인 <span style={{ color: '#EF4444' }}>*</span></label>
                  <input style={D.input} type="password" placeholder="비밀번호 재입력" value={regForm.passwordConfirm} onChange={e => setRegForm(f => ({ ...f, passwordConfirm: e.target.value }))} onFocus={e => (e.target.style.borderColor = '#c9f236')} onBlur={e => (e.target.style.borderColor = '#2A2A32')} autoComplete="new-password" />
                </div>
                {/* 이메일 */}
                <div>
                  <label style={D.label}>이메일 <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    style={D.input}
                    type="email"
                    placeholder="example@email.com"
                    value={regForm.email}
                    onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                    onFocus={e => (e.target.style.borderColor = '#c9f236')}
                    onBlur={e => (e.target.style.borderColor = '#2A2A32')}
                    autoComplete="email"
                  />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#8A8A9A', marginTop: 6 }}>
                    📧 가입 후 이메일로 인증 코드가 발송됩니다
                  </p>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={D.label}>닉네임 <span style={{ color: '#EF4444' }}>*</span></label>
                  <input style={D.input} placeholder="2~10자" value={regForm.nickname} onChange={e => setRegForm(f => ({ ...f, nickname: e.target.value }))} onFocus={e => (e.target.style.borderColor = '#c9f236')} onBlur={e => (e.target.style.borderColor = '#2A2A32')} maxLength={10} />
                </div>
                <div>
                  <label style={D.label}>성별 <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['male', '남자'], ['female', '여자']].map(([val, label]) => (
                      <button key={val} onClick={() => setRegForm(f => ({ ...f, gender: val }))} style={{ padding: '12px 0', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase' as const, border: `2px solid ${regForm.gender === val ? '#c9f236' : '#2A2A32'}`, background: regForm.gender === val ? 'rgba(201,242,54,0.1)' : '#1E1E22', color: regForm.gender === val ? '#c9f236' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={D.label}>나이 <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input style={D.input} type="number" placeholder="나이 입력" value={regForm.age} min={10} max={100} onChange={e => setRegForm(f => ({ ...f, age: e.target.value }))} onFocus={e => (e.target.style.borderColor = '#c9f236')} onBlur={e => (e.target.style.borderColor = '#2A2A32')} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#8A8A9A' }}>세</span>
                  </div>
                </div>
                <div>
                  <label style={D.label}>거주지</label>
                  <AddressSearch label="" value={regForm.activityRegion} placeholder="주소 검색으로 거주지 등록" onChange={result => setRegForm(f => ({ ...f, activityRegion: result.address, homeLat: result.lat || 0, homeLng: result.lng || 0 }))} />
                </div>
                {regForm.activityRegion && (
                  <div>
                    <label style={D.label}>상세주소</label>
                    <input style={D.input} placeholder="동·호수, 건물명 등 (선택)" value={regForm.addressDetail} onChange={e => setRegForm(f => ({ ...f, addressDetail: e.target.value }))} onFocus={e => (e.target.style.borderColor = '#c9f236')} onBlur={e => (e.target.style.borderColor = '#2A2A32')} />
                  </div>
                )}
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A' }}>관심 있는 종목을 선택해주세요 (복수 선택 가능)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {sports.map(s => {
                    const active = regForm.preferredSports.includes(s.id);
                    return (
                      <button key={s.id} onClick={() => toggleSport(s.id)} style={{ padding: '10px 8px', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' as const, border: `2px solid ${active ? '#c9f236' : '#2A2A32'}`, background: active ? 'rgba(201,242,54,0.1)' : '#1E1E22', color: active ? '#c9f236' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s' }}>{s.name}</button>
                    );
                  })}
                </div>
                {regForm.preferredSports.length > 0 && (
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: '#c9f236' }}>{regForm.preferredSports.length}개 선택됨</p>
                )}
              </div>
            )}

            {error && <p style={{ color: '#EF4444', fontSize: 13, fontFamily: 'DM Sans, sans-serif', marginTop: 12 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {step > 1 && (
                <button onClick={() => { setStep(s => s - 1); setError(''); }} style={{ flex: 1, height: 50, borderRadius: 10, border: '1px solid #2A2A32', background: '#1E1E22', color: '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase' as const, cursor: 'pointer' }}>이전</button>
              )}
              {step < 3 ? (
                <button onClick={nextStep} style={{ ...D.btn, flex: 1, height: 50 }}>다음</button>
              ) : (
                <button onClick={handleRegister} style={{ ...D.btn, flex: 1, height: 50, ...(loading ? D.btnDisabled : {}) }} disabled={loading}>{loading ? '가입 중...' : '가입 완료'}</button>
              )}
            </div>
            <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A', marginTop: 12 }}>
              이미 계정이 있으신가요?{' '}
              <button onClick={() => { setTab('login'); setStep(1); setError(''); }} style={{ color: '#c9f236', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>로그인</button>
            </p>
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3E3E4A', marginTop: 16 }}>
        가입 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
      </p>
    </div>
  );
}
