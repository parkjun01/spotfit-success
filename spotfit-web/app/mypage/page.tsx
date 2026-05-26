'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUser(d.data)).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const mannerColor = (s: number) => s >= 38 ? 'text-emerald-500 border-emerald-400' : s >= 30 ? 'text-amber-500 border-amber-400' : 'text-red-500 border-red-400';

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-black text-gray-900">마이페이지</h1>
      </header>

      <div className="p-4 space-y-3">
        {/* 프로필 카드 */}
        {user && (
          <div className="card flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-black">
              {user.nickname?.[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-lg font-black text-gray-900">{user.nickname}</p>
                {user.subscription_status === 'premium' && (
                  <span className="badge bg-amber-100 text-amber-700 text-xs">👑 Premium</span>
                )}
              </div>
              <p className="text-sm text-gray-400">{user.activity_region || '지역 미설정'}</p>
              {user.user_badges?.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {user.user_badges.slice(0, 3).map((ub: any) => (
                    <span key={ub.badges?.id} className="badge bg-indigo-100 text-indigo-600 text-xs">{ub.badges?.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center ${mannerColor(user.manner_score)}`}>
              <span className="text-base font-black">{user.manner_score?.toFixed(1)}</span>
              <span className="text-xs text-gray-400">매너</span>
            </div>
          </div>
        )}

        {/* 메뉴 */}
        <div className="card divide-y divide-gray-100">
          {[
            { label: '프로필 수정', href: '/mypage/edit' },
            { label: '내 스팟 이력', href: '/mypage/spots' },
            { label: '프리미엄 구독', href: '/mypage/premium', badge: user?.subscription_status !== 'premium' },
            { label: '알림 설정', href: '/mypage/notifications' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex items-center justify-between py-3.5 hover:bg-gray-50">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <div className="flex items-center gap-2">
                {item.badge && <span className="badge bg-red-500 text-white text-xs">NEW</span>}
                <span className="text-gray-300">›</span>
              </div>
            </Link>
          ))}
          <button onClick={handleLogout} className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50">
            <span className="text-sm font-medium text-red-500">로그아웃</span>
            <span className="text-gray-300">›</span>
          </button>
        </div>

        {/* 선호 종목 */}
        {user?.user_sports?.length > 0 && (
          <div className="card">
            <p className="text-sm font-bold text-gray-700 mb-2">선호 종목</p>
            <div className="flex flex-wrap gap-2">
              {user.user_sports.map((us: any) => (
                <span key={us.sports?.id} className="badge bg-indigo-100 text-indigo-700">{us.sports?.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t flex">
        {[['/', '🗺', '스팟'], ['/ranking', '🏆', '랭킹'], ['/mypage', '👤', '마이']].map(([href, icon, label]) => (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2 transition-colors ${href === '/mypage' ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
            <span className="text-xl">{icon}</span>
            <span className="text-xs mt-0.5">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
