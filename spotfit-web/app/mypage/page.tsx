'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEvals, setPendingEvals] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    Promise.all([
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/users/me/stats', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ data: null })),
      fetch('/api/evaluations?pending=true', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([u, s, e]) => { setUser(u.data); setStats(s.data); setPendingEvals((e.data || []).length); })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    ['access_token', 'refresh_token', 'user'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    router.push('/login');
  };

  const mannerScore = user?.manner_score ?? 36.5;
  const mannerColor = mannerScore >= 38 ? '#22C55E' : mannerScore >= 30 ? '#F59E0B' : '#EF4444';
  const mannerLabel = mannerScore >= 38 ? 'EXCELLENT' : mannerScore >= 30 ? 'GOOD' : 'WARNING';
  const mannerPct = Math.min(100, (mannerScore / 50) * 100);

  const subScores = [
    { label: '시간 약속', value: stats?.time_score ?? mannerScore * 0.28, icon: 'schedule' },
    { label: '태도/매너', value: stats?.manner_detail ?? mannerScore * 0.28, icon: 'sentiment_satisfied' },
    { label: '운동 실력', value: stats?.skill_score ?? mannerScore * 0.28, icon: 'fitness_center' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#131314' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 96 }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32' }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', letterSpacing: '0.05em' }}>MY PAGE</span>
        <Link href="/mypage/edit" style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A9A', background: '#1E1E22' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
        </Link>
      </header>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Profile Card */}
        {user && (
          <div style={{ background: 'linear-gradient(135deg,#1a2200,#141416)', border: '1px solid rgba(201,242,54,0.2)', borderRadius: 20, padding: 20, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, background: 'radial-gradient(circle,rgba(201,242,54,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#c9f236', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#171e00', flexShrink: 0, overflow: 'hidden', border: user.profile_image ? '3px solid rgba(201,242,54,0.5)' : 'none' }}>
                {user.profile_image
                  ? <img src={user.profile_image} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user.nickname?.[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#ffffef', textTransform: 'uppercase' }}>{user.nickname}</p>
                  {user.subscription_status === 'premium' && (
                    <span style={{ background: '#c9f236', color: '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>👑 PRO</span>
                  )}
                </div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A' }}>{user.activity_region || '지역 미설정'}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: mannerColor, lineHeight: 1 }}>{mannerScore.toFixed(1)}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: mannerColor }}>{mannerLabel}</p>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: '참여 스팟', value: stats?.spot_count ?? user.spot_count ?? 0, unit: '회' },
                { label: '월간 거리', value: stats?.monthly_km ?? '—', unit: 'km' },
                { label: '매너점수', value: mannerScore.toFixed(1), unit: 'pt' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 0', textAlign: 'center', border: '1px solid #2A2A32' }}>
                  <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: '#c9f236', lineHeight: 1 }}>{s.value}<span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A' }}>{s.unit}</span></p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Sub scores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A' }}>세부 평가</p>
              {subScores.map(s => {
                const pct = Math.min(100, (s.value / 10) * 100);
                const c = pct >= 80 ? '#22C55E' : pct >= 60 ? '#c9f236' : '#EF4444';
                return (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#8A8A9A' }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, color: '#c5c9ae' }}>{s.label}</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: c }}>{s.value.toFixed(1)}</span>
                      </div>
                      <div style={{ height: 4, background: '#2A2A32', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preferred Sports */}
        {user?.user_sports?.length > 0 && (
          <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginBottom: 10 }}>선호 종목</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.user_sports.map((us: any) => (
                <span key={us.sports?.id} style={{ padding: '4px 12px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(201,242,54,0.1)', border: '1px solid rgba(201,242,54,0.3)', color: '#c9f236' }}>{us.sports?.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { label: '프로필 수정', href: '/mypage/edit', icon: 'edit' },
            { label: '내 스팟 이력', href: '/mypage/spots', icon: 'history', badge: pendingEvals > 0 ? `평가 ${pendingEvals}건` : null },
            { label: '프리미엄 구독', href: '/mypage/premium', icon: 'workspace_premium', badge: user?.subscription_status !== 'premium' ? 'UPGRADE' : null, lime: true },
            { label: '알림 설정', href: '/mypage/notifications', icon: 'notifications' },
          ].map((item, i) => (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: '1px solid #1E1E22', textDecoration: 'none', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1E1E22')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: item.lime ? '#c9f236' : '#8A8A9A' }}>{item.icon}</span>
              <span style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: item.lime ? '#c9f236' : '#e5e2e3' }}>{item.label}</span>
              {item.badge && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: '#c9f236', color: '#171e00', padding: '2px 8px', borderRadius: 4 }}>{item.badge}</span>}
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3E3E4A' }}>chevron_right</span>
            </Link>
          ))}
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1E1E22')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#EF4444' }}>logout</span>
            <span style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: '#EF4444' }}>로그아웃</span>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3E3E4A' }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 448, height: 68, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px', background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(16px)', borderTop: '1px solid #2A2A32', borderRadius: '16px 16px 0 0' }}>
        {[
          { href: '/', icon: 'home', label: 'Home' },
          { href: '/?view=map', icon: 'map', label: 'Explore' },
          { href: '/spots/new', icon: 'add_box', label: 'Host' },
          { href: '/ranking', icon: 'leaderboard', label: 'Ranks' },
          { href: '/mypage', icon: 'person', label: 'My', active: true },
        ].map(tab => (
          <Link key={tab.href} href={tab.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: (tab as any).active ? '#c9f236' : '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px', minWidth: 56, filter: (tab as any).active ? 'drop-shadow(0 0 6px rgba(201,242,54,0.35))' : 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: (tab as any).active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
