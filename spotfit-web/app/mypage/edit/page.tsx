'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Sport { id: string; name: string; }

export default function EditProfilePage() {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ nickname: '', activityRegion: '', preferredSports: [] as string[] });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    Promise.all([
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/sports').then(r => r.json()),
    ]).then(([userData, sportsData]) => {
      const user = userData.data;
      setSports(sportsData.data || []);
      setAvatarUrl(user?.profile_image || null);
      setForm({
        nickname: user?.nickname || '',
        activityRegion: user?.activity_region || '',
        preferredSports: user?.user_sports?.map((us: any) => us.sports?.id).filter(Boolean) || [],
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('이미지는 2MB 이하여야 합니다'); return; }
    setAvatarUploading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/users/me/avatar', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || '업로드 실패'); return; }
      setAvatarUrl(data.data?.url || null);
    } finally { setAvatarUploading(false); }
  };

  const toggleSport = (id: string) => setForm(f => ({
    ...f, preferredSports: f.preferredSports.includes(id) ? f.preferredSports.filter(s => s !== id) : [...f.preferredSports, id],
  }));

  const handleSave = async () => {
    if (!form.nickname.trim()) return setError('닉네임을 입력해주세요');
    if (form.nickname.length < 2 || form.nickname.length > 20) return setError('닉네임은 2~20자여야 합니다');
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nickname: form.nickname.trim(), activityRegion: form.activityRegion.trim() || undefined, preferredSports: form.preferredSports }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '저장 실패');
      for (const storage of [localStorage, sessionStorage]) {
        const stored = storage.getItem('user');
        if (stored) storage.setItem('user', JSON.stringify({ ...JSON.parse(stored), nickname: form.nickname.trim() }));
      }
      setSaved(true);
      setTimeout(() => router.push('/mypage'), 800);
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#131314' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 100 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#c9f236', letterSpacing: '0.05em', flex: 1 }}>프로필 수정</h1>
        {saved && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase' }}>저장됨 ✓</span>}
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Avatar */}
        <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A8A9A', alignSelf: 'flex-start' }}>프로필 사진</p>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#1E1E22', border: '3px solid rgba(201,242,54,0.4)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatarUploading ? (
                <div style={{ width: 28, height: 28, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#3E3E4A' }}>person</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#c9f236', border: '2px solid #131314', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#171e00' }}>camera_alt</span>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6A6A7A', textAlign: 'center' }}>JPG, PNG, WEBP · 최대 2MB</p>
        </div>

        {/* Basic Info */}
        <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>닉네임</label>
            <input
              style={{ width: '100%', background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 10, padding: '12px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3', outline: 'none', boxSizing: 'border-box' }}
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              onFocus={e => (e.target.style.borderColor = '#c9f236')}
              onBlur={e => (e.target.style.borderColor = '#2A2A32')}
              maxLength={20}
            />
          </div>
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>활동 지역</label>
            <input
              style={{ width: '100%', background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 10, padding: '12px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3', outline: 'none', boxSizing: 'border-box' }}
              placeholder="예: 서울 강남구"
              value={form.activityRegion}
              onChange={e => setForm(f => ({ ...f, activityRegion: e.target.value }))}
              onFocus={e => (e.target.style.borderColor = '#c9f236')}
              onBlur={e => (e.target.style.borderColor = '#2A2A32')}
            />
          </div>
        </div>

        {/* Sports */}
        <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16 }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#e5e2e3', marginBottom: 12 }}>선호 종목</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {sports.map(s => {
              const active = form.preferredSports.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleSport(s.id)} style={{
                  padding: '10px 8px', borderRadius: 10,
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                  border: `2px solid ${active ? '#c9f236' : '#2A2A32'}`,
                  background: active ? 'rgba(201,242,54,0.1)' : '#1E1E22',
                  color: active ? '#c9f236' : '#8A8A9A',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{s.name}</button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EF4444' }}>{error}</p>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 448, background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2A2A32', padding: '12px 16px 20px', zIndex: 50 }}>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', height: 52, background: saved ? '#22C55E' : saving ? '#2a2a2b' : '#c9f236', color: saving ? '#8A8A9A' : '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', borderRadius: 12, cursor: saving ? 'default' : 'pointer', transition: 'all 0.2s' }}>
          {saving ? '저장 중...' : saved ? '✓ 저장됨' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
