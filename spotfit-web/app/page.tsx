'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

const SpotMap = dynamic(() => import('@/components/SpotMap'), { ssr: false });

interface Spot {
  id: string; title: string; sport_name: string; location_name: string;
  latitude: number; longitude: number; current_participants: number;
  max_participants: number; status: string; starts_at: string;
  host_nickname: string; host_manner_score: number; distance_meters?: number;
  difficulty_level: string;
}

interface Region {
  name: string;
  lat: number;
  lng: number;
}

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };

const SPORT_COLORS: Record<string, string> = {
  '축구': '#16A34A', '풋살': '#22C55E', '농구': '#EA580C', '야구': '#2563EB',
  '배드민턴': '#9333EA', '테니스': '#CA8A04', '탁구': '#0891B2', '수영': '#06B6D4',
  '러닝': '#DC2626', '등산': '#78350F', '클라이밍': '#C2410C', '요가': '#DB2777',
  '필라테스': '#EC4899', '헬스': '#475569', '골프': '#15803D', '볼링': '#7C3AED',
  '배구': '#D97706', '핸드볼': '#0D9488',
};
const getSportColor = (name: string) => SPORT_COLORS[name] || '#F97316';

const SPORT_EMOJIS: Record<string, string> = {
  '축구': '⚽', '풋살': '⚽', '농구': '🏀', '야구': '⚾', '배드민턴': '🏸',
  '테니스': '🎾', '탁구': '🏓', '수영': '🏊', '러닝': '🏃', '등산': '🧗',
  '클라이밍': '🧗', '요가': '🧘', '필라테스': '🤸', '헬스': '💪', '골프': '⛳',
  '볼링': '🎳', '배구': '🏐', '핸드볼': '🤾',
};

const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '3km', value: 3000 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
];

function saveRegion(region: Region) {
  try {
    const recent: Region[] = JSON.parse(localStorage.getItem('recent_regions') || '[]');
    const filtered = recent.filter(r => r.name !== region.name).slice(0, 4);
    localStorage.setItem('recent_regions', JSON.stringify([region, ...filtered]));
    localStorage.setItem('selected_region', JSON.stringify(region));
  } catch {}
}

function loadRegion(): Region | null {
  try {
    const s = localStorage.getItem('selected_region');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

function loadRecentRegions(): Region[] {
  try {
    return JSON.parse(localStorage.getItem('recent_regions') || '[]');
  } catch { return []; }
}

export default function HomePage() {
  const router = useRouter();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [region, setRegion] = useState<Region | null>(null);
  const [radius, setRadius] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [showRegionSheet, setShowRegionSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Region[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentRegions, setRecentRegions] = useState<Region[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('access_token') && !sessionStorage.getItem('access_token')) {
      router.push('/login');
      return;
    }
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
    setRecentRegions(loadRecentRegions());

    const saved = loadRegion();
    if (saved) {
      setRegion(saved);
    } else {
      // 저장된 동네 없으면 GPS 또는 홈 위치로
      try {
        const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u.homeLat && u.homeLng) {
            reverseGeocode(u.homeLat, u.homeLng).then(name => {
              setRegion({ name, lat: u.homeLat, lng: u.homeLng });
            });
            return;
          }
        }
      } catch {}
      navigator.geolocation?.getCurrentPosition(
        pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          reverseGeocode(lat, lng).then(name => setRegion({ name, lat, lng }));
        },
        () => setRegion({ name: '서울 중구', lat: 37.5665, lng: 126.978 })
      );
    }
  }, []);

  useEffect(() => {
    if (region) loadSpots();
  }, [region, selectedSport, radius]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      return data.data?.name || '현재 위치';
    } catch { return '현재 위치'; }
  };

  const loadSpots = async () => {
    if (!region) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(region.lat), lng: String(region.lng),
        radius: String(radius),
        ...(selectedSport && { sportId: selectedSport }),
      });
      const res = await fetch(`/api/spots?${params}`);
      const data = await res.json();
      setSpots(data.data || []);
    } finally { setLoading(false); }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults([{ name: q, lat: data.data.lat, lng: data.data.lng }]);
        } else {
          setSearchResults([]);
        }
      } finally { setSearching(false); }
    }, 600);
  };

  const selectRegion = (r: Region) => {
    setRegion(r);
    saveRegion(r);
    setRecentRegions(loadRecentRegions());
    setShowRegionSheet(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const useCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        reverseGeocode(lat, lng).then(name => selectRegion({ name, lat, lng }));
      },
      () => alert('위치 권한을 허용해주세요')
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* 헤더 */}
      <header className="bg-white px-4 pt-4 pb-2 sticky top-0 z-20 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          {/* 동네 선택 버튼 (당근 스타일) */}
          <button
            onClick={() => setShowRegionSheet(true)}
            className="flex items-center gap-1.5 group"
          >
            <span className="text-xl font-black text-gray-900">
              {region?.name || '동네 선택'}
            </span>
            <svg className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
              className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 py-2 text-sm font-semibold text-gray-600"
            >
              {viewMode === 'list' ? <><MapIcon className="w-4 h-4" />지도</> : <><ListIcon className="w-4 h-4" />목록</>}
            </button>
            <Link href="/mypage" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-600" />
            </Link>
          </div>
        </div>

        {/* 반경 선택 */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {RADIUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRadius(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                radius === opt.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1 flex-shrink-0" />
          {/* 종목 필터 */}
          {[{ id: '', name: '전체' }, ...sports.slice(0, 8)].map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSport(s.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedSport === s.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {s.id && SPORT_EMOJIS[s.name] ? `${SPORT_EMOJIS[s.name]} ` : ''}{s.name}
            </button>
          ))}
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'map' ? (
          <SpotMap spots={spots} userLocation={region ? { lat: region.lat, lng: region.lng } : { lat: 37.5665, lng: 126.978 }} />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="px-4 pt-3 pb-1">
              <span className="text-xs font-semibold text-gray-400">
                {loading ? '로딩 중...' : `${region?.name || ''} 스팟 ${spots.length}개`}
              </span>
            </div>

            <div className="px-4 pb-24 space-y-3 pt-1">
              {loading && (
                <div className="space-y-3 pt-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="h-1 bg-gray-100" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 bg-gray-100 rounded-full w-1/3 animate-pulse" />
                        <div className="h-5 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && spots.length === 0 && (
                <div className="text-center pt-20 space-y-3">
                  <p className="text-5xl">🏟</p>
                  <p className="font-extrabold text-gray-800">{region?.name}에 스팟이 없어요</p>
                  <p className="text-sm text-gray-400">첫 번째 스팟을 만들어보세요!</p>
                  <Link href="/spots/new" className="inline-block btn-primary text-sm mt-2">스팟 만들기</Link>
                </div>
              )}

              {spots.map(spot => {
                const color = getSportColor(spot.sport_name);
                const isFull = spot.status === 'full';
                const barColor = isFull ? '#94A3B8' : color;
                const fillPct = Math.min(100, Math.round((spot.current_participants / spot.max_participants) * 100));

                return (
                  <Link key={spot.id} href={`/spots/${spot.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform shadow-sm">
                      <div className="h-1" style={{ background: barColor }} />
                      <div className="p-4">
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: barColor }}>
                            {SPORT_EMOJIS[spot.sport_name] || '🏅'} {spot.sport_name}
                          </span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isFull ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isFull ? '마감' : '모집중'}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                            {DIFFICULTY[spot.difficulty_level]}
                          </span>
                          {spot.distance_meters != null && (
                            <span className="ml-auto text-xs text-gray-400 font-semibold">
                              {(spot.distance_meters / 1000).toFixed(1)}km
                            </span>
                          )}
                        </div>

                        <p className="font-extrabold text-gray-900 text-[15px] leading-snug mb-2.5 line-clamp-2">{spot.title}</p>

                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="flex-shrink-0">📍</span>
                            <span className="truncate">{spot.location_name}</span>
                          </span>
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <span>🕐</span>
                            <span>{format(new Date(spot.starts_at), 'M/d HH:mm')}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                              <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: barColor }} />
                            </div>
                            <p className="text-xs font-bold text-gray-600">
                              <span style={{ color: barColor }}>{spot.current_participants}</span>
                              <span className="text-gray-400">/{spot.max_participants}명</span>
                              <span className="text-gray-400 font-normal ml-1.5">
                                · {formatDistanceToNow(new Date(spot.starts_at), { addSuffix: true, locale: ko })}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-6 h-6 rounded-full text-white text-xs font-extrabold flex items-center justify-center" style={{ background: barColor }}>
                              {spot.host_nickname?.[0]}
                            </div>
                            <span className="text-xs font-bold text-amber-500">★{spot.host_manner_score?.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      <Link href="/spots/new" className="fixed bottom-20 right-4 bg-primary text-white font-extrabold w-14 h-14 rounded-full shadow-lg shadow-orange-300 hover:bg-orange-600 transition-all active:scale-95 z-10 flex items-center justify-center text-2xl">
        +
      </Link>

      {/* 하단 탭 */}
      <nav className="bg-white border-t border-gray-100 flex fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-20">
        {[
          { href: '/', icon: <MapIcon className="w-6 h-6" />, label: '스팟', active: true },
          { href: '/benefits', icon: <GiftIcon className="w-6 h-6" />, label: '혜택', active: false },
          { href: '/ranking', icon: <TrophyIcon className="w-6 h-6" />, label: '랭킹', active: false },
          { href: '/mypage', icon: <UserIcon className="w-6 h-6" />, label: '마이', active: false },
        ].map(({ href, icon, label, active }) => (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2.5 transition-colors ${active ? 'text-primary' : 'text-gray-300'}`}>
            {icon}
            <span className="text-xs mt-0.5 font-semibold">{label}</span>
          </Link>
        ))}
      </nav>

      {/* 동네 선택 바텀시트 */}
      {showRegionSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRegionSheet(false)} />
          <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-8 max-h-[80vh] flex flex-col">
            {/* 핸들 */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            <h2 className="text-lg font-extrabold text-gray-900 mb-3">동네 선택</h2>

            {/* 검색창 */}
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:bg-gray-50 focus:ring-2 focus:ring-primary/20"
                placeholder="동·읍·면으로 검색 (예: 역삼동, 수원시)"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="overflow-y-auto flex-1 space-y-1">
              {/* GPS 현재 위치 */}
              <button
                onClick={useCurrentLocation}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📍</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">현재 위치로 설정</p>
                  <p className="text-xs text-gray-400">GPS로 자동 감지</p>
                </div>
              </button>

              {/* 검색 결과 */}
              {searchResults.map(r => (
                <button
                  key={r.name}
                  onClick={() => selectRegion(r)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🔍</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                    <p className="text-xs text-gray-400">탭하여 이 동네로 이동</p>
                  </div>
                </button>
              ))}

              {/* 최근 동네 */}
              {!searchQuery && recentRegions.length > 0 && (
                <>
                  <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wide px-1 pt-3 pb-1">최근 동네</p>
                  {recentRegions.map(r => (
                    <button
                      key={r.name}
                      onClick={() => selectRegion(r)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                        region?.name === r.name ? 'bg-orange-50 border border-primary/20' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🏘</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                      </div>
                      {region?.name === r.name && (
                        <span className="text-xs font-bold text-primary">현재</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {searchQuery && !searching && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  검색 결과가 없습니다.<br />다른 이름으로 검색해보세요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>;
}
function MapIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>;
}
function ListIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
}
function TrophyIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>;
}
function UserIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
