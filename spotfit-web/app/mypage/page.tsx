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
    ]).then(([userData, statsData, evalData]) => {
      setUser(userData.data);
      setStats(statsData.data);
      setPendingEvals((evalData.data || []).length);
    }).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    ['access_token', 'refresh_token', 'user'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    router.push('/login');
  };

  const mannerScore = user?.manner_score ?? 36.5;
  const mannerColor = mannerScore >= 38 ? '#10B981' : mannerScore >= 30 ? '#F59E0B' : '#EF4444';
  const mannerLabel = mannerScore >= 38 ? 'Excellent' : mannerScore >= 30 ? 'Good' : 'Warning';

  const subScores = [
    { label: '시간 약속', value: stats?.time_score ?? mannerScore * 0.28, max: 10, icon: '⏰' },
    { label: '태도/매너', value: stats?.manner_detail ?? mannerScore * 0.28, max: 10, icon: '😊' },
    { label: '운동 실력', value: stats?.skill_score ?? mannerScore * 0.28, max: 10, icon: '💪' },
  ];

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-gray-900">마이페이지</h1>
      </header>

      <div className="p-4 space-y-3">

        {/* 프로필 카드 */}
        {user && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-1 bg-primary" />
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-black">
                  {user.nickname?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-lg font-black text-gray-900">{user.nickname}</p>
                    {user.subscription_status === 'premium' && (
                      <span className="badge bg-amber-100 text-amber-700 font-extrabold">👑 PREMIUM</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{user.activity_region || '지역 미설정'}</p>
                </div>
                <div className="text-center">
                  <div
                    className="w-14 h-14 rounded-full border-3 flex flex-col items-center justify-center"
                    style={{ border: `3px solid ${mannerColor}` }}
                  >
                    <span className="text-base font-black" style={{ color: mannerColor }}>{mannerScore.toFixed(1)}</span>
                  </div>
                  <p className="text-xs font-bold mt-1" style={{ color: mannerColor }}>{mannerLabel}</p>
                </div>
              </div>

              {/* 활동 통계 3칸 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: '참여 스팟', value: stats?.spot_count ?? user.spot_count ?? 0, unit: '회' },
                  { label: '월간 거리', value: stats?.monthly_km ?? '-', unit: 'km' },
                  { label: '매너점수', value: mannerScore.toFixed(1), unit: 'pt' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-gray-900">{s.value}<span className="text-xs font-bold text-gray-400 ml-0.5">{s.unit}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* 서브 점수 */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wide">세부 평가 점수</p>
                {subScores.map(s => {
                  const pct = Math.min(100, (s.value / s.max) * 100);
                  const color = pct >= 80 ? '#10B981' : pct >= 60 ? '#F97316' : '#EF4444';
                  return (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-base w-6">{s.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-600">{s.label}</span>
                          <span className="font-bold" style={{ color }}>{s.value.toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 선호 종목 */}
        {user?.user_sports?.length > 0 && (
          <div className="card">
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wide mb-2">선호 종목</p>
            <div className="flex flex-wrap gap-2">
              {user.user_sports.map((us: any) => (
                <span key={us.sports?.id} className="badge bg-orange-100 text-orange-700">{us.sports?.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* 메뉴 */}
        <div className="card divide-y divide-gray-50">
          {[
            { label: '프로필 수정', href: '/mypage/edit', icon: '✏️' },
            { label: '내 스팟 이력', href: '/mypage/spots', icon: '📋', badge: pendingEvals > 0, badgeText: `평가 ${pendingEvals}건` },
            { label: '👑 프리미엄 구독', href: '/mypage/premium', icon: '', badge: user?.subscription_status !== 'premium', badgeText: 'UPGRADE' },
            { label: '알림 설정', href: '/mypage/notifications', icon: '🔔' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between py-3.5 hover:bg-gray-50 transition-colors">
              <span className="text-sm font-semibold text-gray-700">{item.icon && `${item.icon} `}{item.label}</span>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className="badge bg-primary text-white text-xs">{(item as any).badgeText || 'NEW'}</span>
                )}
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </Link>
          ))}
          <button onClick={handleLogout} className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 transition-colors">
            <span className="text-sm font-semibold text-red-500">🚪 로그아웃</span>
            <span className="text-gray-300 text-lg">›</span>
          </button>
        </div>
      </div>

      <BottomNav active="mypage" />
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
  const tabs = [
    { href: '/', key: 'home', label: '스팟', icon: <MapIcon /> },
    { href: '/benefits', key: 'benefits', label: '혜택', icon: <GiftIcon /> },
    { href: '/ranking', key: 'ranking', label: '랭킹', icon: <TrophyIcon /> },
    { href: '/mypage', key: 'mypage', label: '마이', icon: <UserIcon /> },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-20">
      {tabs.map(t => (
        <Link key={t.key} href={t.href} className={`flex-1 flex flex-col items-center py-2.5 transition-colors ${active === t.key ? 'text-primary' : 'text-gray-300'}`}>
          <div className="w-6 h-6">{t.icon}</div>
          <span className="text-xs mt-0.5 font-semibold">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
function MapIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>; }
function GiftIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>; }
function TrophyIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>; }
function UserIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
