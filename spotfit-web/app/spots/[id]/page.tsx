'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };
const STATUS_MAP: Record<string, string> = { recruiting: '모집중', full: '마감', in_progress: '진행중', completed: '종료', cancelled: '취소' };

const SPORT_COLORS: Record<string, string> = {
  '축구': '#16A34A', '풋살': '#22C55E', '농구': '#EA580C', '야구': '#2563EB',
  '배드민턴': '#9333EA', '테니스': '#CA8A04', '탁구': '#0891B2', '수영': '#06B6D4',
  '러닝': '#DC2626', '등산': '#78350F', '클라이밍': '#C2410C', '요가': '#DB2777',
  '필라테스': '#EC4899', '헬스': '#475569', '골프': '#15803D', '볼링': '#7C3AED',
  '배구': '#D97706', '핸드볼': '#0D9488',
};
const getSportColor = (name: string) => SPORT_COLORS[name] || '#F97316';

export default function SpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spot, setSpot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeData, setRouteData] = useState<{
    start: { lat: number; lng: number };
    coords: [number, number][];
    distance: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    setToken(t);
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) setMyUserId(JSON.parse(stored).id);
    fetch(`/api/spots/${id}`).then(r => r.json()).then(d => setSpot(d.data)).finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    if (!token) { router.push('/login'); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/spots/${id}/join`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }
      alert('참여 완료! 🎉');
      router.push(`/spots/${id}/chat`);
    } finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!confirm('참여를 취소하시겠습니까?')) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/spots/${id}/join`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }
      alert('참여가 취소되었습니다');
      window.location.reload();
    } finally { setLeaving(false); }
  };

  const handleShowRoute = () => {
    if (routeData) { setShowRoute(v => !v); return; }
    setRouteLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: sLat, longitude: sLng } = pos.coords;
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/walking/${sLng},${sLat};${spot.longitude},${spot.latitude}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          const route = data.routes?.[0];
          if (route) {
            const coords: [number, number][] = route.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            );
            setRouteData({ start: { lat: sLat, lng: sLng }, coords, distance: route.distance, duration: route.duration });
            setShowRoute(true);
          }
        } catch { alert('경로를 불러오지 못했습니다'); }
        setRouteLoading(false);
      },
      () => { alert('위치 권한이 필요합니다'); setRouteLoading(false); }
    );
  };

  const handleCancelSpot = async () => {
    if (!confirm('스팟을 취소하시겠습니까? 참여자에게 알림이 발송됩니다.')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/spots/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }
      alert('스팟이 취소되었습니다');
      router.push('/');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!spot) return <div className="text-center pt-20 text-gray-500">스팟을 찾을 수 없습니다</div>;

  const sportColor = getSportColor(spot.sports?.name);
  const mannerScore = spot.users?.manner_score;
  const participants = spot.participations?.filter((p: any) => p.status === 'joined') || [];
  const isFull = spot.status === 'full';
  const isHost = myUserId && spot.host_id === myUserId;
  const isParticipating = myUserId && participants.some((p: any) => p.user_id === myUserId);
  const canJoin = !isFull && spot.status === 'recruiting' && !isParticipating && !isHost;
  const isActive = ['recruiting', 'full'].includes(spot.status);
  const fillPct = Math.min(100, Math.round((spot.current_participants / spot.max_participants) * 100));

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-extrabold text-gray-900 truncate flex-1">{spot.title}</span>
        {isHost && isActive && (
          <Link href={`/spots/${id}/edit`} className="text-xs font-semibold text-gray-400 hover:text-primary">수정</Link>
        )}
      </header>

      <div className="p-4 space-y-3">

        {/* 히어로 카드 */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="h-2" style={{ background: isFull ? '#94A3B8' : sportColor }} />
          <div className="p-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: isFull ? '#94A3B8' : sportColor }}>
                {spot.sports?.name}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                spot.status === 'recruiting' ? 'bg-emerald-100 text-emerald-700' :
                spot.status === 'full' ? 'bg-red-100 text-red-600' :
                'bg-gray-100 text-gray-500'
              }`}>{STATUS_MAP[spot.status]}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                {DIFFICULTY[spot.difficulty_level]}
              </span>
              {(spot.min_age || spot.max_age) && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                  {spot.min_age && spot.max_age ? `${spot.min_age}~${spot.max_age}세`
                    : spot.min_age ? `${spot.min_age}세 이상` : `${spot.max_age}세 이하`}
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 leading-tight mb-4">{spot.title}</h1>

            {/* 핵심 스탯 2x2 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { icon: '📍', label: '장소', value: spot.location_name },
                { icon: '🕐', label: '일시', value: format(new Date(spot.starts_at), 'M월 d일 HH:mm', { locale: ko }) },
                { icon: '⚡', label: '난이도', value: DIFFICULTY[spot.difficulty_level] },
                { icon: '👥', label: '인원', value: `${spot.current_participants}/${spot.max_participants}명` },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">{icon} {label}</p>
                  <p className="font-bold text-sm text-gray-800 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* 참여 프로그레스 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-500">참여율</span>
                <span style={{ color: isFull ? '#94A3B8' : sportColor }}>{fillPct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: isFull ? '#94A3B8' : sportColor }} />
              </div>
            </div>
          </div>
        </div>

        {/* 호스트 */}
        <div className="card flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0"
            style={{ background: sportColor }}
          >
            {spot.users?.nickname?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium">팀장</p>
            <p className="font-extrabold text-gray-900">
              {spot.users?.nickname}
              {isHost && <span className="ml-1 text-xs text-gray-400 font-normal">(나)</span>}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400 mb-0.5">매너점수</p>
            <p className={`text-lg font-extrabold ${
              mannerScore >= 38 ? 'text-emerald-600' : mannerScore >= 30 ? 'text-amber-500' : 'text-red-500'
            }`}>★{mannerScore?.toFixed(1)}</p>
          </div>
        </div>

        {/* 설명 */}
        {spot.description && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">상세 설명</p>
            <p className="text-sm text-gray-700 leading-relaxed">{spot.description}</p>
          </div>
        )}

        {/* 태그 */}
        {spot.spot_tags?.length > 0 && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">태그</p>
            <div className="flex flex-wrap gap-2">
              {spot.spot_tags.map((st: any) => (
                <span key={st.tags?.id} className="badge bg-gray-100 text-gray-600">#{st.tags?.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* 참여자 */}
        {participants.length > 0 && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">참여자 {participants.length}명</p>
            <div className="flex flex-wrap gap-3">
              {participants.map((p: any) => (
                <div key={p.user_id} className="flex flex-col items-center gap-1 w-14">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-base"
                    style={{ background: p.user_id === spot.host_id ? sportColor : '#8B5CF6' }}
                  >
                    {p.users?.nickname?.[0]}
                  </div>
                  <span className="text-xs text-gray-700 text-center truncate w-full">{p.users?.nickname}</span>
                  <span className="text-xs font-bold text-amber-500">★{p.users?.manner_score?.toFixed(1)}</span>
                  {p.user_id === spot.host_id && (
                    <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: sportColor, fontSize: 10 }}>팀장</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 길 안내 */}
        {spot.latitude && spot.longitude && (
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">길 안내</p>
            <p className="text-xs text-gray-400 mb-3">{spot.location_name}</p>

            {/* 앱 내 경로 보기 */}
            <button
              onClick={handleShowRoute}
              disabled={routeLoading}
              className="w-full py-3 mb-3 rounded-xl font-extrabold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: showRoute ? '#F3F4F6' : sportColor, color: showRoute ? '#6B7280' : 'white' }}
            >
              {routeLoading ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />위치 확인 중...</>
              ) : showRoute ? '경로 닫기 ✕' : '🗺️ 경로 보기'}
            </button>

            {showRoute && routeData && (
              <div className="mb-3">
                <RouteMap
                  start={routeData.start}
                  end={{ lat: spot.latitude, lng: spot.longitude, name: spot.location_name }}
                  routeCoords={routeData.coords}
                  distance={routeData.distance}
                  duration={routeData.duration}
                />
              </div>
            )}

            {/* 외부 앱 연결 */}
            <div className="flex gap-2">
              <a
                href={`https://map.kakao.com/link/to/${encodeURIComponent(spot.location_name)},${spot.latitude},${spot.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2 rounded-xl bg-yellow-400 text-yellow-900 text-xs font-bold hover:bg-yellow-500 transition-colors"
              >카카오맵</a>
              <a
                href={`https://map.naver.com/index.nhn?elng=${spot.longitude}&elat=${spot.latitude}&etext=${encodeURIComponent(spot.location_name)}&menu=route`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
              >네이버지도</a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}&travelmode=walking`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
              >구글지도</a>
            </div>
          </div>
        )}

        {/* 평가 */}
        {spot.status === 'completed' && isParticipating && (
          <Link href={`/spots/${id}/evaluate`}>
            <div className="card bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-amber-800">평가하기</p>
                <p className="text-xs text-amber-600">함께한 팀원들을 평가해주세요</p>
              </div>
              <span className="text-amber-500 text-xl">›</span>
            </div>
          </Link>
        )}
      </div>

      {/* 하단 액션 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <Link href={`/spots/${id}/chat`} className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-primary hover:text-primary transition-colors">
          💬 채팅
        </Link>

        {isHost && isActive ? (
          <button
            className="flex-1 bg-red-50 text-red-500 font-bold py-3 px-4 rounded-xl border border-red-200 hover:bg-red-100 transition-colors"
            onClick={handleCancelSpot} disabled={cancelling}
          >
            {cancelling ? '취소 중...' : '스팟 취소'}
          </button>
        ) : isParticipating && isActive ? (
          <button
            className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
            onClick={handleLeave} disabled={leaving}
          >
            {leaving ? '처리 중...' : '참여 취소'}
          </button>
        ) : canJoin ? (
          <button
            className="flex-1 text-white font-extrabold py-3 px-4 rounded-xl shadow-sm transition-all active:scale-95"
            style={{ background: sportColor }}
            onClick={handleJoin} disabled={joining}
          >
            {joining ? '참여 중...' : '참여하기 →'}
          </button>
        ) : (
          <button className="flex-1 bg-gray-200 text-gray-500 font-bold py-3 px-4 rounded-xl cursor-not-allowed" disabled>
            {isFull ? '마감된 스팟' : STATUS_MAP[spot.status]}
          </button>
        )}
      </div>
    </div>
  );
}
