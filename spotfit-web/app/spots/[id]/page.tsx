'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };
const STATUS_MAP: Record<string, string> = { recruiting: '모집중', full: '마감', in_progress: '진행중', completed: '종료', cancelled: '취소' };

export default function SpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spot, setSpot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('access_token'));
    fetch(`/api/spots/${id}`).then(r => r.json()).then(d => setSpot(d.data)).finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    if (!token) { router.push('/login'); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/spots/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }
      alert('참여 완료! 🎉');
      router.push(`/spots/${id}/chat`);
    } finally { setJoining(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!spot) return <div className="text-center pt-20 text-gray-500">스팟을 찾을 수 없습니다</div>;

  const mannerScore = spot.users?.manner_score;
  const mannerColor = mannerScore >= 38 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : mannerScore >= 30 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  const participants = spot.participations?.filter((p: any) => p.status === 'joined') || [];
  const isFull = spot.status === 'full';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 border-b">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">←</button>
        <span className="font-bold text-gray-800 truncate flex-1">{spot.title}</span>
      </header>

      <div className="p-4 space-y-3">
        {/* 종목/상태 배지 */}
        <div className="card">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="badge bg-indigo-100 text-indigo-700">{spot.sports?.name}</span>
            <span className="badge bg-gray-100 text-gray-600">{STATUS_MAP[spot.status]}</span>
            <span className="badge bg-amber-100 text-amber-700">{DIFFICULTY[spot.difficulty_level]}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{spot.title}</h1>
        </div>

        {/* 호스트 */}
        <div className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
            {spot.users?.nickname?.[0]}
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">호스트</p>
            <p className="font-bold text-gray-900">{spot.users?.nickname}</p>
          </div>
          <span className={`badge border ${mannerColor}`}>★ {mannerScore?.toFixed(1)}</span>
        </div>

        {/* 핵심 정보 */}
        <div className="card grid grid-cols-2 gap-4">
          {[
            { icon: '📍', label: '장소', value: spot.location_name },
            { icon: '🕐', label: '일시', value: format(new Date(spot.starts_at), 'MM월 dd일 HH:mm', { locale: ko }) },
            { icon: '👥', label: '인원', value: `${spot.current_participants}/${spot.max_participants}명` },
            { icon: '⚡', label: '난이도', value: DIFFICULTY[spot.difficulty_level] },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <span className="text-lg">{icon}</span>
              <div><p className="text-xs text-gray-400">{label}</p><p className="font-semibold text-sm text-gray-800">{value}</p></div>
            </div>
          ))}
        </div>

        {/* 설명 */}
        {spot.description && (
          <div className="card">
            <p className="text-sm font-bold text-gray-700 mb-2">상세 설명</p>
            <p className="text-sm text-gray-600 leading-relaxed">{spot.description}</p>
          </div>
        )}

        {/* 태그 */}
        {spot.spot_tags?.length > 0 && (
          <div className="card">
            <p className="text-sm font-bold text-gray-700 mb-2">태그</p>
            <div className="flex flex-wrap gap-2">
              {spot.spot_tags.map((st: any) => (
                <span key={st.tags?.id} className="badge bg-gray-100 text-gray-600">{st.tags?.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* 참여자 */}
        <div className="card">
          <p className="text-sm font-bold text-gray-700 mb-3">참여자 ({participants.length}명)</p>
          <div className="flex flex-wrap gap-3">
            {participants.map((p: any) => (
              <div key={p.user_id} className="flex flex-col items-center gap-1 w-14">
                <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold">
                  {p.users?.nickname?.[0]}
                </div>
                <span className="text-xs text-gray-700 text-center truncate w-full">{p.users?.nickname}</span>
                <span className="text-xs text-amber-500">★{p.users?.manner_score?.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 액션 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 p-4 flex gap-3">
        <Link href={`/spots/${id}/chat`} className="flex-1 btn-secondary text-center">💬 채팅방</Link>
        {!isFull && spot.status === 'recruiting' ? (
          <button className="flex-1 btn-primary" onClick={handleJoin} disabled={joining}>
            {joining ? '참여 중...' : '참여하기'}
          </button>
        ) : (
          <button className="flex-1 bg-gray-200 text-gray-500 font-bold py-3 px-6 rounded-xl cursor-not-allowed" disabled>
            {isFull ? '마감된 스팟' : STATUS_MAP[spot.status]}
          </button>
        )}
      </div>
    </div>
  );
}
