'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

const SpotMap = dynamic(() => import('@/components/SpotMap'), { ssr: false });

interface Spot {
  id: string; title: string; sport_name: string; location_name: string;
  latitude: number; longitude: number; current_participants: number;
  max_participants: number; status: string; starts_at: string;
  host_nickname: string; host_manner_score: number; distance_meters?: number;
  difficulty_level: string;
}
interface Region { name: string; lat: number; lng: number; }

const SPORT_EMOJIS: Record<string, string> = {
  '축구': '⚽', '풋살': '⚽', '농구': '🏀', '야구': '⚾', '배드민턴': '🏸',
  '테니스': '🎾', '탁구': '🏓', '수영': '🏊', '러닝': '🏃', '등산': '🧗',
  '클라이밍': '🧗', '요가': '🧘', '필라테스': '🤸', '헬스': '💪', '골프': '⛳',
  '볼링': '🎳', '배구': '🏐', '핸드볼': '🤾',
};
const SPORT_ICONS: Record<string, string> = {
  '축구': 'sports_soccer', '풋살': 'sports_soccer', '농구': 'sports_basketball',
  '야구': 'sports_baseball', '배드민턴': 'sports_badminton', '테니스': 'sports_tennis',
  '탁구': 'sports_tennis', '수영': 'pool', '러닝': 'directions_run', '등산': 'landscape',
  '클라이밍': 'landscape', '요가': 'self_improvement', '필라테스': 'self_improvement',
  '헬스': 'fitness_center', '골프': 'golf_course', '볼링': 'sports', '배구': 'sports_volleyball', '핸드볼': 'sports_handball',
};
const RADIUS_OPTIONS = [
  { label: '500m', value: 500 }, { label: '1km', value: 1000 },
  { label: '3km', value: 3000 }, { label: '5km', value: 5000 }, { label: '10km', value: 10000 },
];

function saveRegion(r: Region) {
  try {
    const recent: Region[] = JSON.parse(localStorage.getItem('recent_regions') || '[]');
    localStorage.setItem('recent_regions', JSON.stringify([r, ...recent.filter(x => x.name !== r.name).slice(0, 4)]));
    localStorage.setItem('selected_region', JSON.stringify(r));
  } catch {}
}
function loadRegion(): Region | null {
  try { const s = localStorage.getItem('selected_region'); return s ? JSON.parse(s) : null; } catch { return null; }
}
function loadRecentRegions(): Region[] {
  try { return JSON.parse(localStorage.getItem('recent_regions') || '[]'); } catch { return []; }
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
  const [spotCount, setSpotCount] = useState(0);

  // 리스트뷰 검색
  const [listSearch, setListSearch] = useState('');

  // 지도뷰 검색
  const [mapSearch, setMapSearch] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState<Region[]>([]);
  const [mapSearching, setMapSearching] = useState(false);
  const [showMapSearchDrop, setShowMapSearchDrop] = useState(false);

  // 지도뷰 필터 패널
  const [showMapFilter, setShowMapFilter] = useState(false);
  const [mapSport, setMapSport] = useState('');
  const [mapRadius, setMapRadius] = useState(5000);

  // 고급 필터
  const [difficulty, setDifficulty] = useState('');       // '' | 'beginner' | 'intermediate' | 'advanced'
  const [recruitingOnly, setRecruitingOnly] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('access_token') && !sessionStorage.getItem('access_token')) {
      router.push('/login'); return;
    }
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
    setRecentRegions(loadRecentRegions());
    const saved = loadRegion();
    if (saved) { setRegion(saved); return; }
    try {
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.homeLat && u.homeLng) {
          reverseGeocode(u.homeLat, u.homeLng).then(name => setRegion({ name, lat: u.homeLat, lng: u.homeLng }));
          return;
        }
      }
    } catch {}
    navigator.geolocation?.getCurrentPosition(
      pos => reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(name =>
        setRegion({ name, lat: pos.coords.latitude, lng: pos.coords.longitude })
      ),
      () => setRegion({ name: '서울 중구', lat: 37.5665, lng: 126.978 })
    );
  }, []);

  useEffect(() => { if (region) loadSpots(); }, [region, selectedSport, radius, difficulty, recruitingOnly]);

  // 지도뷰 필터 변경 시 스팟 재로드
  useEffect(() => {
    if (viewMode === 'map' && region) loadMapSpots();
  }, [mapSport, mapRadius]);

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
        lat: String(region.lat), lng: String(region.lng), radius: String(radius),
        ...(selectedSport && { sportId: selectedSport }),
        ...(difficulty && { difficulty }),
        ...(recruitingOnly && { recruiting: 'true' }),
      });
      const res = await fetch(`/api/spots?${params}`);
      const data = await res.json();
      const list = data.data || [];
      setSpots(list);
      setSpotCount(list.length);
    } finally { setLoading(false); }
  };

  const loadMapSpots = async () => {
    if (!region) return;
    try {
      const params = new URLSearchParams({ lat: String(region.lat), lng: String(region.lng), radius: String(mapRadius), ...(mapSport && { sportId: mapSport }) });
      const res = await fetch(`/api/spots?${params}`);
      const data = await res.json();
      setSpots(data.data || []);
    } catch {}
  };

  // 리스트뷰 검색 필터
  const filteredSpots = listSearch.trim()
    ? spots.filter(s =>
        s.title.toLowerCase().includes(listSearch.toLowerCase()) ||
        s.sport_name.toLowerCase().includes(listSearch.toLowerCase()) ||
        s.location_name.toLowerCase().includes(listSearch.toLowerCase())
      )
    : spots;

  // 동네 시트 검색
  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success) setSearchResults([{ name: q, lat: data.data.lat, lng: data.data.lng }]);
        else setSearchResults([]);
      } finally { setSearching(false); }
    }, 600);
  };

  // 지도뷰 장소 검색
  const handleMapSearch = (q: string) => {
    setMapSearch(q);
    if (mapSearchTimer.current) clearTimeout(mapSearchTimer.current);
    if (!q.trim()) { setMapSearchResults([]); setShowMapSearchDrop(false); return; }
    mapSearchTimer.current = setTimeout(async () => {
      setMapSearching(true);
      try {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success) {
          setMapSearchResults([{ name: q, lat: data.data.lat, lng: data.data.lng }]);
          setShowMapSearchDrop(true);
        } else {
          setMapSearchResults([]);
          setShowMapSearchDrop(false);
        }
      } finally { setMapSearching(false); }
    }, 600);
  };

  const selectMapLocation = (r: Region) => {
    setRegion(r); saveRegion(r);
    setMapSearch(r.name);
    setShowMapSearchDrop(false);
    setMapSearchResults([]);
  };

  const selectRegion = (r: Region) => {
    setRegion(r); saveRegion(r); setRecentRegions(loadRecentRegions());
    setShowRegionSheet(false); setSearchQuery(''); setSearchResults([]);
  };

  const useCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(name =>
        selectRegion({ name, lat: pos.coords.latitude, lng: pos.coords.longitude })
      ),
      () => alert('위치 권한을 허용해주세요')
    );
  };

  const switchToMap = () => {
    setViewMode('map');
    setMapSport(selectedSport);
    setMapRadius(radius);
  };

  // ── MAP VIEW ──────────────────────────────────────────────
  if (viewMode === 'map') {
    // 지도뷰에서 필터된 스팟
    const mapSpots = mapSport ? spots.filter(s => sports.find(sp => sp.id === mapSport)?.name === s.sport_name) : spots;

    return (
      <div style={{ height: '100dvh', background: '#0E0E0F', overflow: 'hidden', position: 'relative' }}>

        {/* Map Search Header */}
        <header style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, height: 64,
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px',
          background: 'rgba(19,19,20,0.96)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #2A2A32',
        }}>
          {/* 리스트뷰로 돌아가기 */}
          <button onClick={() => setViewMode('list')} style={{ width: 40, height: 40, background: '#141416', border: '1px solid #2A2A32', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A9A', cursor: 'pointer', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
          </button>

          {/* 검색창 */}
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: '0 12px', height: 40, gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#c5c9ae', flexShrink: 0 }}>search</span>
              <input
                style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3', width: '100%' }}
                placeholder="장소 검색 (예: 강남구, 홍대)…"
                value={mapSearch}
                onChange={e => handleMapSearch(e.target.value)}
                onFocus={() => { if (mapSearchResults.length > 0) setShowMapSearchDrop(true); }}
              />
              {mapSearching && <div style={{ width: 14, height: 14, border: '2px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
              {mapSearch && (
                <button onClick={() => { setMapSearch(''); setMapSearchResults([]); setShowMapSearchDrop(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A9A', display: 'flex', padding: 0, flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              )}
            </div>

            {/* 검색 결과 드롭다운 */}
            {showMapSearchDrop && mapSearchResults.length > 0 && (
              <div style={{ position: 'absolute', top: 46, left: 0, right: 0, background: '#141416', border: '1px solid #2A2A32', borderRadius: 12, zIndex: 100, overflow: 'hidden' }}>
                {mapSearchResults.map(r => (
                  <button key={r.name} onClick={() => selectMapLocation(r)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1E1E22')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#c9f236' }}>location_on</span>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#e5e2e3', fontSize: 14 }}>{r.name}</p>
                      <p style={{ fontSize: 11, color: '#8A8A9A' }}>이 위치로 지도 이동</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 필터 버튼 */}
          <button
            onClick={() => setShowMapFilter(v => !v)}
            style={{ width: 40, height: 40, background: showMapFilter ? '#c9f236' : '#141416', border: `1px solid ${showMapFilter ? '#c9f236' : '#2A2A32'}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: showMapFilter ? '#171e00' : '#c9f236', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>tune</span>
          </button>
        </header>

        {/* 지도뷰 필터 패널 */}
        {showMapFilter && (
          <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 39, background: 'rgba(19,19,20,0.98)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32', padding: '12px 16px 14px' }}>
            {/* 종목 필터 */}
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginBottom: 8 }}>종목</p>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }} className="no-scrollbar">
              {[{ id: '', name: 'ALL' }, ...sports].map(s => (
                <button key={s.id} onClick={() => { setMapSport(s.id); setSelectedSport(s.id); }} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  background: mapSport === s.id ? '#c9f236' : '#1E1E22',
                  color: mapSport === s.id ? '#171e00' : '#8A8A9A',
                  border: `1px solid ${mapSport === s.id ? '#c9f236' : '#2A2A32'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{s.name}</button>
              ))}
            </div>
            {/* 반경 필터 */}
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginBottom: 8 }}>반경</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' as const }}>
              {RADIUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setMapRadius(opt.value); setRadius(opt.value); }} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  background: mapRadius === opt.value ? '#c9f236' : '#1E1E22',
                  color: mapRadius === opt.value ? '#171e00' : '#8A8A9A',
                  border: `1px solid ${mapRadius === opt.value ? '#c9f236' : '#2A2A32'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{opt.label}</button>
              ))}
            </div>
            {/* 난이도 필터 */}
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginBottom: 8 }}>난이도</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[{ v: '', l: '전체' }, { v: 'beginner', l: '초급' }, { v: 'intermediate', l: '중급' }, { v: 'advanced', l: '고급' }].map(({ v, l }) => (
                <button key={v} onClick={() => { setDifficulty(v); }} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  background: difficulty === v ? '#c9f236' : '#1E1E22',
                  color: difficulty === v ? '#171e00' : '#8A8A9A',
                  border: `1px solid ${difficulty === v ? '#c9f236' : '#2A2A32'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{l}</button>
              ))}
            </div>
            {/* 모집상태 */}
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', marginBottom: 8 }}>모집상태</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: false, l: '전체' }, { v: true, l: '모집중만' }].map(({ v, l }) => (
                <button key={String(v)} onClick={() => setRecruitingOnly(v)} style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  background: recruitingOnly === v ? '#c9f236' : '#1E1E22',
                  color: recruitingOnly === v ? '#171e00' : '#8A8A9A',
                  border: `1px solid ${recruitingOnly === v ? '#c9f236' : '#2A2A32'}`,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {/* Full-screen Kakao Map */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, width: '100vw', height: '100dvh' }}>
          <SpotMap
            spots={mapSpots}
            center={region ? { lat: region.lat, lng: region.lng } : undefined}
            onSpotClick={(spot) => router.push(`/spots/${spot.id}`)}
          />
        </div>

        {/* 스팟 수 배지 */}
        <div style={{ position: 'fixed', top: showMapFilter ? 180 : 76, left: 16, zIndex: 38, background: 'rgba(20,20,22,0.9)', border: '1px solid #2A2A32', borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, transition: 'top 0.2s' }}>
          <div style={{ width: 6, height: 6, background: '#c9f236', borderRadius: '50%' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#e5e2e3' }}>{mapSpots.length} spots</span>
        </div>

        {/* Bottom Spot Preview Cards */}
        <div style={{ position: 'fixed', bottom: 'calc(68px + 12px)', left: 0, right: 0, zIndex: 40, padding: '0 16px 8px' }}>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }} className="no-scrollbar">
            {mapSpots.slice(0, 5).map((spot) => {
              const isFull = spot.status === 'full';
              const isClosing = !isFull && spot.current_participants / spot.max_participants >= 0.8;
              const mannerPct = Math.min(100, ((spot.host_manner_score || 35) / 50) * 100);
              const dist = spot.distance_meters != null ? spot.distance_meters < 1000 ? `${Math.round(spot.distance_meters)}m` : `${(spot.distance_meters / 1000).toFixed(1)}km` : '';
              return (
                <div key={spot.id} onClick={() => router.push(`/spots/${spot.id}`)} style={{
                  minWidth: '88%', maxWidth: 360, background: '#141416', border: '1px solid #2A2A32',
                  borderRadius: 16, padding: 16, scrollSnapAlign: 'center', flexShrink: 0,
                  cursor: 'pointer', transition: 'border-color 0.2s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9f236')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A32')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ padding: '4px 10px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: 4, background: isFull ? '#3E3E4A' : isClosing ? '#fd591e' : '#c9f236', color: isFull ? '#8A8A9A' : '#171e00' }}>
                      {isFull ? '마감' : isClosing ? 'Closing Soon' : 'Recruiting'}
                    </span>
                    {dist && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1E1E22', padding: '4px 10px', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, color: '#e5e2e3' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#c9f236' }}>near_me</span>
                        {dist}
                      </div>
                    )}
                  </div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', color: '#ffffef', marginBottom: 8, lineHeight: 1.15 }}>{spot.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#c5c9ae', fontSize: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                      {format(new Date(spot.starts_at), 'HH:mm')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
                      <span style={{ color: isFull ? '#fd591e' : '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                        {spot.current_participants}/{spot.max_participants}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A', fontWeight: 600, textTransform: 'uppercase' }}>{spot.sport_name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c5c9ae' }}>Manner Score</span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#c9f236' }}>{((spot.host_manner_score || 35) * 2).toFixed(0)}</span>
                    </div>
                    <div style={{ width: '100%', height: 4, background: '#1E1E22', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${mannerPct}%`, background: '#c9f236', borderRadius: 999 }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {mapSpots.length === 0 && (
              <div style={{ minWidth: '88%', background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 24, textAlign: 'center', color: '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14 }}>
                주변에 스팟이 없습니다
              </div>
            )}
          </div>
        </div>

        {/* FAB */}
        <Link href="/spots/new" className="lime-glow" style={{
          position: 'fixed', bottom: 'calc(68px + 100px)', right: 16, zIndex: 50,
          width: 56, height: 56, borderRadius: '50%', background: '#c9f236',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(201,242,54,0.4), 0 2px 8px rgba(0,0,0,0.4)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#171e00', fontWeight: 600 }}>add</span>
        </Link>

        <BottomNav active="map" onListClick={() => setViewMode('list')} />
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen" style={{ background: '#131314' }}>

      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2A2A32',
      }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', letterSpacing: '0.05em', textTransform: 'uppercase' }}>SPOTFIT</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/mypage/notifications" style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e2e3', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1E1E22')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>notifications</span>
          </Link>
          <Link href="/mypage" style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '2px solid #c9f236', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E1E22' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#8A8A9A' }}>person</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">

        <section style={{ background: 'linear-gradient(160deg,#1a1f00 0%,#131314 55%)', padding: '40px 16px 36px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 260, height: 260, background: 'radial-gradient(circle,rgba(200,241,53,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <button onClick={() => setShowRegionSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6 }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae' }}>
              {region?.name || '서울'} · 오늘
            </p>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#8A8A9A' }}>expand_more</span>
          </button>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 52, lineHeight: 0.95, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 12 }}>
            FIND<br/><span style={{ color: '#e5e2e3' }}>YOUR</span><br/>SPOT
          </h1>
          <p style={{ fontSize: 14, color: '#8A8A9A', maxWidth: 280, lineHeight: 1.55 }}>
            도심 속 최고의 운동 스팟을 발견하고<br/>함께 땀 흘릴 크루를 만나세요.
          </p>
        </section>

        {/* 검색창 — 실제 필터 연동 */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 14, color: '#8A8A9A', fontSize: 22 }}>search</span>
            <input
              style={{ width: '100%', background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 999, padding: '13px 48px 13px 46px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3', outline: 'none', transition: 'border-color 0.2s' }}
              placeholder="종목, 지역, 스팟 이름 검색…"
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
              onFocus={e => (e.target.style.borderColor = '#c9f236')}
              onBlur={e => (e.target.style.borderColor = '#2A2A32')}
            />
            {listSearch ? (
              <button onClick={() => setListSearch('')} style={{ position: 'absolute', right: 6, width: 36, height: 36, background: '#2A2A32', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A9A', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            ) : (
              <button onClick={switchToMap} style={{ position: 'absolute', right: 6, width: 36, height: 36, background: '#c9f236', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#171e00', border: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>map</span>
              </button>
            )}
          </div>
          {listSearch && (
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#8A8A9A', marginTop: 6, paddingLeft: 4 }}>
              "{listSearch}" 검색 결과 {filteredSpots.length}개
            </p>
          )}
        </div>

        {/* 종목 필터 */}
        <nav style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px' }} className="no-scrollbar">
          {[
            { id: '', name: 'ALL', icon: 'bolt' },
            ...sports.slice(0, 8).map(s => ({ id: s.id, name: s.name, icon: SPORT_ICONS[s.name] || 'sports' }))
          ].map(s => {
            const active = selectedSport === s.id;
            return (
              <button key={s.id} onClick={() => setSelectedSport(s.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                minWidth: 64, padding: '12px 8px',
                background: active ? 'rgba(201,242,54,0.08)' : '#1E1E22',
                border: `1px solid ${active ? '#c9f236' : '#2A2A32'}`,
                borderRadius: 16, flexShrink: 0,
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: active ? '#c9f236' : '#8A8A9A',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{s.icon}</span>
                {s.name}
              </button>
            );
          })}
        </nav>

        {/* 통계 배너 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '0 16px' }}>
          {[
            { value: String(spotCount || spots.length), label: 'Active Spots' },
            { value: '1.2K', label: 'Members' },
            { value: '98%', label: 'Match Rate' },
          ].map(({ value, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 12, padding: 16 }}>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: '#c9f236', lineHeight: 1 }}>{value}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8A9A' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* 반경 필터 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '12px 16px 0' }} className="no-scrollbar">
          {RADIUS_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setRadius(opt.value)} style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              background: radius === opt.value ? '#c9f236' : '#1E1E22',
              color: radius === opt.value ? '#171e00' : '#8A8A9A',
              border: `1px solid ${radius === opt.value ? '#c9f236' : '#2A2A32'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>{opt.label}</button>
          ))}
        </div>

        {/* 난이도 + 모집상태 필터 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 16px 0' }} className="no-scrollbar">
          {[{ v: '', l: '전체 난이도' }, { v: 'beginner', l: '초급' }, { v: 'intermediate', l: '중급' }, { v: 'advanced', l: '고급' }].map(({ v, l }) => (
            <button key={v} onClick={() => setDifficulty(v)} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: difficulty === v ? 'rgba(201,242,54,0.15)' : '#1E1E22',
              color: difficulty === v ? '#c9f236' : '#8A8A9A',
              border: `1px solid ${difficulty === v ? '#c9f236' : '#2A2A32'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>{l}</button>
          ))}
          <div style={{ width: 1, background: '#2A2A32', flexShrink: 0, margin: '4px 2px' }} />
          <button onClick={() => setRecruitingOnly(v => !v)} style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 999,
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            background: recruitingOnly ? 'rgba(201,242,54,0.15)' : '#1E1E22',
            color: recruitingOnly ? '#c9f236' : '#8A8A9A',
            border: `1px solid ${recruitingOnly ? '#c9f236' : '#2A2A32'}`,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>모집중만</button>
        </div>

        {/* 스팟 목록 */}
        <div style={{ padding: '16px 16px 96px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: '#e5e2e3' }}>
              {listSearch ? `🔍 "${listSearch}"` : '🔥 Hot Spots'}
            </h2>
            <button onClick={switchToMap} style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c9f236', background: 'none', border: 'none', cursor: 'pointer' }}>
              지도뷰 →
            </button>
          </div>

          {loading && [1,2,3].map(i => (
            <div key={i} style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, height: 200, marginBottom: 12 }} />
          ))}

          {!loading && filteredSpots.length === 0 && (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ fontSize: 48 }}>{listSearch ? '🔍' : '🏟'}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#e5e2e3', marginTop: 12 }}>
                {listSearch ? `"${listSearch}" 검색 결과 없음` : `${region?.name}에 스팟이 없어요`}
              </p>
              <p style={{ fontSize: 14, color: '#8A8A9A', marginTop: 6 }}>
                {listSearch ? '다른 키워드로 검색해보세요' : '첫 번째 스팟을 만들어보세요!'}
              </p>
              {!listSearch && (
                <Link href="/spots/new" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: '#c9f236', color: '#171e00', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>
                  스팟 만들기
                </Link>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredSpots.map(spot => {
              const isFull = spot.status === 'full';
              const fillPct = Math.min(100, Math.round((spot.current_participants / spot.max_participants) * 100));
              const isClosing = !isFull && fillPct >= 80;
              return (
                <Link key={spot.id} href={`/spots/${spot.id}`}>
                  <div style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = 'translateY(-3px)'; d.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)'; }}
                    onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.transform = ''; d.style.boxShadow = ''; }}
                  >
                    <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, background: 'linear-gradient(135deg,#1a2200,#0d1a00)' }}>
                      {SPORT_EMOJIS[spot.sport_name] || '🏅'}
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' as const }}>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: isFull ? '#3E3E4A' : isClosing ? 'rgba(253,89,30,0.15)' : '#c9f236', color: isFull ? '#8A8A9A' : isClosing ? '#fd591e' : '#171e00', border: isClosing ? '1px solid #fd591e' : 'none' }}>
                          {isFull ? '마감' : isClosing ? '마감임박' : '모집중'}
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, background: '#2a2a2b', color: '#8A8A9A', border: '1px solid #2A2A32', textTransform: 'uppercase' }}>
                          {spot.sport_name}
                        </span>
                        {spot.distance_meters != null && (
                          <span style={{ marginLeft: 'auto', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#8A8A9A', fontWeight: 600 }}>
                            {(spot.distance_meters / 1000).toFixed(1)}km
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700, color: '#e5e2e3', marginBottom: 8, lineHeight: 1.25 }}>{spot.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#8A8A9A', marginBottom: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{spot.location_name}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                          {format(new Date(spot.starts_at), 'M/d HH:mm')}
                        </span>
                      </div>
                      <div style={{ borderTop: '1px solid #2A2A32', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#c9f236' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>group</span>
                          {spot.current_participants}/{spot.max_participants}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#c9f236' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 1" }}>star</span>
                          {spot.host_manner_score?.toFixed(1)}
                        </div>
                      </div>
                      <div style={{ marginTop: 8, height: 3, background: '#2A2A32', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${fillPct}%`, background: isFull ? '#3E3E4A' : '#c9f236', borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <button onClick={switchToMap} className="lime-glow" style={{
        position: 'fixed', bottom: 'calc(68px + 16px)', right: 20, zIndex: 45,
        width: 56, height: 56, borderRadius: '50%', background: '#c9f236',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 24px rgba(201,242,54,0.35)', border: 'none', cursor: 'pointer',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#171e00' }}>map</span>
      </button>

      <BottomNav active="home" onMapClick={switchToMap} />

      {/* 동네 선택 시트 */}
      {showRegionSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowRegionSheet(false)} />
          <div style={{ position: 'relative', background: '#141416', borderRadius: '24px 24px 0 0', padding: '16px 16px 32px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #2A2A32', borderBottom: 'none' }}>
            <div style={{ width: 40, height: 4, background: '#2A2A32', borderRadius: 999, margin: '0 auto 16px' }} />
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#e5e2e3', marginBottom: 12, textTransform: 'uppercase' }}>동네 선택</p>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8A8A9A', fontSize: 20 }}>search</span>
              <input
                style={{ width: '100%', background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 999, padding: '12px 12px 12px 40px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3', outline: 'none' }}
                placeholder="동·읍·면으로 검색…"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                autoFocus
              />
              {searching && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: '2px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={useCurrentLocation} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1E1E22')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(201,242,54,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#c9f236', fontSize: 20 }}>my_location</span>
                </div>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#e5e2e3', fontSize: 14 }}>현재 위치로 설정</p>
                  <p style={{ fontSize: 12, color: '#8A8A9A' }}>GPS로 자동 감지</p>
                </div>
              </button>
              {searchResults.map(r => (
                <button key={r.name} onClick={() => selectRegion(r)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'rgba(201,242,54,0.05)', border: '1px solid rgba(201,242,54,0.15)', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(201,242,54,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ color: '#c9f236', fontSize: 20 }}>search</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#e5e2e3', fontSize: 14 }}>{r.name}</p>
                    <p style={{ fontSize: 12, color: '#8A8A9A' }}>탭하여 이 동네로 이동</p>
                  </div>
                </button>
              ))}
              {!searchQuery && recentRegions.length > 0 && (
                <>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A', padding: '12px 4px 4px' }}>최근 동네</p>
                  {recentRegions.map(r => (
                    <button key={r.name} onClick={() => selectRegion(r)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: region?.name === r.name ? 'rgba(201,242,54,0.08)' : 'transparent', border: region?.name === r.name ? '1px solid rgba(201,242,54,0.3)' : '1px solid transparent', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1E1E22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: '#8A8A9A', fontSize: 20 }}>location_city</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#e5e2e3', fontSize: 14 }}>{r.name}</p>
                      </div>
                      {region?.name === r.name && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color: '#c9f236', textTransform: 'uppercase' }}>현재</span>}
                    </button>
                  ))}
                </>
              )}
              {searchQuery && !searching && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#8A8A9A', fontSize: 14 }}>
                  검색 결과가 없습니다.<br/>다른 이름으로 검색해보세요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomNav({ active, onMapClick, onListClick }: { active: string; onMapClick?: () => void; onListClick?: () => void }) {
  const tabs = [
    { href: '/', key: 'home', icon: 'home', label: 'Home', onClick: onListClick },
    { href: '/', key: 'map', icon: 'map', label: 'Explore', onClick: onMapClick },
    { href: '/spots/new', key: 'host', icon: 'add_box', label: 'Host' },
    { href: '/ranking', key: 'ranking', icon: 'leaderboard', label: 'Ranks' },
    { href: '/benefits', key: 'benefits', icon: 'local_offer', label: '혜택' },
  ];
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 448, height: 68, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px',
      background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(16px)',
      borderTop: '1px solid #2A2A32', borderRadius: '16px 16px 0 0',
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.key;
        return (
          <Link key={tab.key} href={tab.href} onClick={tab.onClick} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, color: isActive ? '#c9f236' : '#8A8A9A',
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '4px 8px', minWidth: 56, transition: 'color 0.2s',
            filter: isActive ? 'drop-shadow(0 0 6px rgba(201,242,54,0.35))' : 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
