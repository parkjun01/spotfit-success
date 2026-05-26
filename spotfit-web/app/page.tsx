'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

declare global {
  interface Window { naver: any; }
}

interface Spot {
  id: string; title: string; sport_name: string; location_name: string;
  latitude: number; longitude: number; current_participants: number;
  max_participants: number; status: string; starts_at: string;
  host_nickname: string; host_manner_score: number; distance_meters?: number;
  difficulty_level: string;
}

const STATUS_COLOR: Record<string, string> = {
  recruiting: 'bg-emerald-100 text-emerald-700',
  full: 'bg-red-100 text-red-600',
  in_progress: 'bg-blue-100 text-blue-700',
};

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };

export default function HomePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.978 });
  const [loading, setLoading] = useState(true);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => { loadSpots(); }, [userLocation, selectedSport]);

  const loadSpots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(userLocation.lat), lng: String(userLocation.lng),
        radius: '5000', ...(selectedSport && { sportId: selectedSport }),
      });
      const res = await fetch(`/api/spots?${params}`);
      const data = await res.json();
      setSpots(data.data || []);
    } finally { setLoading(false); }
  };

  // 네이버맵 초기화
  useEffect(() => {
    if (viewMode !== 'map' || !mapRef.current) return;
    const init = () => {
      if (!window.naver?.maps) return;
      mapInstance.current = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(userLocation.lat, userLocation.lng),
        zoom: 14,
        mapTypeControl: false,
      });
      renderMarkers();
    };
    if (window.naver?.maps) init();
    else { const t = setInterval(() => { if (window.naver?.maps) { init(); clearInterval(t); } }, 200); }
  }, [viewMode, userLocation]);

  const renderMarkers = () => {
    if (!mapInstance.current) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = spots.map(spot => {
      if (!spot.latitude || !spot.longitude) return null;
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(spot.latitude, spot.longitude),
        map: mapInstance.current,
        title: spot.title,
        icon: {
          content: `<div class="px-2 py-1 rounded-full text-xs font-bold shadow-md ${spot.status === 'full' ? 'bg-red-500' : 'bg-indigo-600'} text-white whitespace-nowrap">${spot.sport_name}</div>`,
          anchor: new window.naver.maps.Point(20, 10),
        },
      });
      window.naver.maps.Event.addListener(marker, 'click', () => {
        window.location.href = `/spots/${spot.id}`;
      });
      return marker;
    }).filter(Boolean);
  };

  useEffect(() => { if (viewMode === 'map') renderMarkers(); }, [spots]);

  const mannerColor = (score: number) =>
    score >= 38 ? 'text-emerald-600' : score >= 30 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <span className="text-xl font-black text-primary">SpotFit</span>
        <div className="flex gap-2">
          <Link href="/mypage" className="text-gray-500 hover:text-primary transition-colors">👤</Link>
        </div>
      </header>

      {/* 종목 필터 */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {[{ id: '', name: '전체' }, ...sports.slice(0, 8)].map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSport(s.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedSport === s.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* 뷰 토글 */}
      <div className="flex bg-white border-b border-gray-100 px-4 py-2 gap-2 items-center justify-between">
        <span className="text-sm text-gray-500">{spots.length}개 스팟</span>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {(['map', 'list'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${viewMode === m ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {m === 'map' ? '🗺 지도' : '☰ 목록'}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'map' ? (
          <div ref={mapRef} className="w-full h-full" />
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-3">
            {loading && <div className="text-center text-gray-400 pt-12">로딩 중...</div>}
            {!loading && spots.length === 0 && (
              <div className="text-center pt-16">
                <p className="text-gray-500 font-medium">주변에 스팟이 없습니다</p>
                <Link href="/spots/new" className="mt-4 inline-block btn-primary text-sm">새 스팟 만들기</Link>
              </div>
            )}
            {spots.map(spot => (
              <Link key={spot.id} href={`/spots/${spot.id}`}>
                <div className="card hover:shadow-md transition-shadow">
                  <div className="flex gap-2 mb-2">
                    <span className="badge bg-indigo-100 text-indigo-700">{spot.sport_name}</span>
                    <span className={`badge ${STATUS_COLOR[spot.status] || 'bg-gray-100 text-gray-600'}`}>
                      {spot.status === 'recruiting' ? '모집중' : spot.status === 'full' ? '마감' : '진행중'}
                    </span>
                    <span className="badge bg-amber-100 text-amber-700">{DIFFICULTY[spot.difficulty_level]}</span>
                  </div>
                  <p className="font-bold text-gray-900 truncate">{spot.title}</p>
                  <p className="text-sm text-gray-500 mt-1">📍 {spot.location_name}
                    {spot.distance_meters && <span className="ml-2">{(spot.distance_meters / 1000).toFixed(1)}km</span>}
                  </p>
                  <p className="text-sm text-gray-500">🕐 {format(new Date(spot.starts_at), 'MM/dd HH:mm')}
                    <span className="ml-1 text-xs text-gray-400">
                      ({formatDistanceToNow(new Date(spot.starts_at), { addSuffix: true, locale: ko })})
                    </span>
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm font-semibold text-gray-700">👥 {spot.current_participants}/{spot.max_participants}명</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">{spot.host_nickname}</span>
                      <span className={`text-xs font-bold ${mannerColor(spot.host_manner_score)}`}>
                        ★{spot.host_manner_score?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <Link href="/spots/new"
        className="fixed bottom-6 right-4 bg-primary text-white font-bold px-5 py-3.5 rounded-full shadow-lg shadow-indigo-300 hover:bg-indigo-700 transition-colors z-10">
        + 스팟 생성
      </Link>

      {/* 하단 탭 */}
      <nav className="bg-white border-t border-gray-100 flex">
        {[['/', '🗺', '스팟'], ['/ranking', '🏆', '랭킹'], ['/mypage', '👤', '마이']].map(([href, icon, label]) => (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2 text-gray-400 hover:text-primary transition-colors">
            <span className="text-xl">{icon}</span>
            <span className="text-xs mt-0.5">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
