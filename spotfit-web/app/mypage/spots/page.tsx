'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  recruiting: { label: '모집중', color: 'bg-emerald-100 text-emerald-700' },
  full: { label: '마감', color: 'bg-red-100 text-red-600' },
  in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '종료', color: 'bg-gray-100 text-gray-500' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-gray-400' },
};

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };

export default function MySpotHistoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'participated' | 'hosted'>('participated');
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    fetch(`/api/users/me/spots?type=${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => setSpots(d.data || [])).finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-lg font-bold text-gray-900">내 스팟 이력</h1>
      </header>

      {/* 탭 */}
      <div className="flex bg-white border-b">
        {([['participated', '참여한 스팟'], ['hosted', '생성한 스팟']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${
              tab === val ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading && (
          <div className="flex justify-center pt-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        {!loading && spots.length === 0 && (
          <div className="text-center pt-16 space-y-3">
            <p className="text-4xl">🏃</p>
            <p className="text-gray-500 font-medium">
              {tab === 'participated' ? '참여한 스팟이 없습니다' : '생성한 스팟이 없습니다'}
            </p>
            <Link href="/" className="inline-block text-sm text-primary font-semibold">
              스팟 찾아보기 →
            </Link>
          </div>
        )}
        {spots.map(spot => {
          const statusInfo = STATUS_MAP[spot.status] || { label: spot.status, color: 'bg-gray-100 text-gray-500' };
          return (
            <Link key={spot.id} href={`/spots/${spot.id}`}>
              <div className="card hover:shadow-md transition-shadow">
                <div className="flex gap-2 mb-2">
                  {spot.sports?.name && (
                    <span className="badge bg-indigo-100 text-indigo-700">{spot.sports.name}</span>
                  )}
                  <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
                  {spot.difficulty_level && (
                    <span className="badge bg-amber-100 text-amber-700">{DIFFICULTY[spot.difficulty_level]}</span>
                  )}
                </div>
                <p className="font-bold text-gray-900 truncate">{spot.title}</p>
                <p className="text-sm text-gray-500 mt-1 truncate">📍 {spot.location_name}</p>
                {spot.starts_at && (
                  <p className="text-sm text-gray-500">
                    🕐 {format(new Date(spot.starts_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    👥 {spot.current_participants}/{spot.max_participants}명
                  </span>
                  {tab === 'hosted' && spot.participations?.[0] && (
                    <span className="text-xs text-gray-400">
                      총 {spot.participations[0].count}명 참여
                    </span>
                  )}
                  {spot.status === 'completed' && (
                    <span className="text-xs text-amber-600 font-semibold">평가 가능</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
