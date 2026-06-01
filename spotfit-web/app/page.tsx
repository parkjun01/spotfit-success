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
interface Region { name: string; lat: number; lng: number; }

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };
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

function saveRegion(r: Region) {
  try {
    const recent: Region[] = JSON.parse(localStorage.getItem('recent_regions') || '[]');
    const filtered = recent.filter(x => x.name !== r.name).slice(0, 4);
    localStorage.setItem('recent_regions', JSON.stringify([r, ...filtered]));
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
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => { if (region) loadSpots(); }, [region, selectedSport, radius]);

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
        if (data.success) setSearchResults([{ name: q, lat: data.data.lat, lng: data.data.lng }]);
        else setSearchResults([]);
      } finally { setSearching(false); }
    }, 600);
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

  return (
    <div className="flex flex-col h-screen" style={{ background: '#131314' }}>

      {/* Top Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2A2A32',
      }}>
        <button onClick={() => setShowRegionSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: '#c9f236', letterSpacing: '0.05em' }}>
            {region?.name || 'SPOTFIT'}
          </span>
          <span className="material-symbols-outlined" style={{ color: '#8A8A9A', fontSize: 20 }}>expand_more</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
            style={{ width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'rgba(201,242,54,0.1)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {viewMode === 'list' ? 'map' : 'format_list_bulleted'}
            </span>
          </button>
          <Link href="/mypage" style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '2px solid #2A2A32', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E1E22' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#8A8A9A' }}>person</span>
          </Link>
        </div>
      </header>

      {/* Hero + filters */}
      {viewMode === 'list' && (
        <div style={{ background: 'linear-gradient(160deg,#1a1f00 0%,#131314 55%)', padding: '28px 16px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, background: 'radial-gradient(circle,rgba(200,241,53,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae', marginBottom: 6 }}>서울 · 오늘</p>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 44, lineHeight: 0.95, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 10 }}>
            FIND<br/><span style={{ color: '#e5e2e3' }}>YOUR</span><br/>SPOT
          </h1>

          {/* Radius pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginTop: 14 }} className="no-scrollbar">
            {RADIUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setRadius(opt.value)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                background: radius === opt.value ? '#c9f236' : '#1E1E22',
                color: radius === opt.value ? '#171e00' : '#8A8A9A',
                border: `1px solid ${radius === opt.value ? '#c9f236' : '#2A2A32'}`,
                transition: 'all 0.2s',
              }}>{opt.label}</button>
            ))}
            <div style={{ width: 1, background: '#2A2A32', flexShrink: 0, margin: '0 4px' }} />
            {[{ id: '', name: '전체' }, ...sports.slice(0, 6)].map(s => (
              <button key={s.id} onClick={() => setSelectedSport(s.id)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 999,
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700,
                background: selectedSport === s.id ? '#c9f236' : '#1E1E22',
                color: selectedSport === s.id ? '#171e00' : '#8A8A9A',
                border: `1px solid ${selectedSport === s.id ? '#c9f236' : '#2A2A32'}`,
                transition: 'all 0.2s',
              }}>
                {s.id && SPORT_EMOJIS[s.name] ? `${SPORT_EMOJIS[s.name]} ` : ''}{s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'map' ? (
          <SpotMap spots={spots} center={region ? { lat: region.lat, lng: region.lng } : undefined} />
        ) : (
          <div className="h-full overflow-y-auto">
            <div style={{ padding: '12px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8A9A' }}>
                {loading ? '로딩 중...' : `🔥 Hot Spots · ${spots.length}개`}
              </span>
            </div>

            <div style={{ padding: '0 16px 96px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading && [1,2,3].map(i => (
                <div key={i} style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, height: 160, animation: 'pulse 1.5s infinite' }} />
              ))}

              {!loading && spots.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <p style={{ fontSize: 48 }}>🏟</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700, color: '#e5e2e3', marginTop: 12 }}>{region?.name}에 스팟이 없어요</p>
                  <p style={{ fontSize: 14, color: '#8A8A9A', marginTop: 6 }}>첫 번째 스팟을 만들어보세요!</p>
                  <Link href="/spots/new" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', background: '#c9f236', color: '#171e00', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>
                    스팟 만들기
                  </Link>
                </div>
              )}

              {spots.map(spot => {
                const isFull = spot.status === 'full';
                const fillPct = Math.min(100, Math.round((spot.current_participants / spot.max_participants) * 100));
                return (
                  <Link key={spot.id} href={`/spots/${spot.id}`}>
                    <div style={{
                      background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16,
                      overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                    >
                      {/* emoji placeholder */}
                      <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'linear-gradient(135deg,#1a2200,#0d1a00)' }}>
                        {SPORT_EMOJIS[spot.sport_name] || '🏅'}
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' as const }}>
                          <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: isFull ? '#3E3E4A' : '#c9f236', color: isFull ? '#8A8A9A' : '#171e00' }}>
                            {isFull ? '마감' : '모집중'}
                          </span>
                          <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, background: '#2a2a2b', color: '#8A8A9A', border: '1px solid #2A2A32', textTransform: 'uppercase' }}>
                            {spot.sport_name}
                          </span>
                          <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, background: '#2a2a2b', color: '#8A8A9A', border: '1px solid #2A2A32' }}>
                            {DIFFICULTY[spot.difficulty_level]}
                          </span>
                          {spot.distance_meters != null && (
                            <span style={{ marginLeft: 'auto', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#8A8A9A', fontWeight: 600 }}>
                              {(spot.distance_meters / 1000).toFixed(1)}km
                            </span>
                          )}
                        </div>
                        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700, color: '#ffffef', marginBottom: 8, lineHeight: 1.25 }}>
                          {spot.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#8A8A9A', marginBottom: 10 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>location_on</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{spot.location_name}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>
                            {format(new Date(spot.starts_at), 'M/d HH:mm')}
                          </span>
                        </div>
                        <div style={{ borderTop: '1px solid #2A2A32', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#c9f236' }}>
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
        )}
      </main>

      {/* FAB */}
      <Link href="/spots/new" className="lime-glow" style={{
        position: 'fixed', bottom: 'calc(68px + 16px)', right: 20, zIndex: 45,
        width: 56, height: 56, borderRadius: '50%', background: '#c9f236',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 24px rgba(201,242,54,0.35)', transition: 'transform 0.2s',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#171e00', fontWeight: 700 }}>add</span>
      </Link>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, height: 68, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0 8px',
        background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid #2A2A32', borderRadius: '16px 16px 0 0',
      }}>
        {[
          { href: '/', key: 'home', icon: 'home', label: 'Home', active: true },
          { href: '/?view=map', key: 'explore', icon: 'map', label: 'Explore', active: false },
          { href: '/spots/new', key: 'host', icon: 'add_box', label: 'Host', active: false },
          { href: '/ranking', key: 'ranking', icon: 'leaderboard', label: 'Ranks', active: false },
          { href: '/benefits', key: 'benefits', icon: 'local_offer', label: '혜택', active: false },
        ].map(tab => (
          <Link key={tab.key} href={tab.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, color: tab.active ? '#c9f236' : '#8A8A9A',
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '4px 8px', minWidth: 56, transition: 'color 0.2s',
            filter: tab.active ? 'drop-shadow(0 0 6px rgba(201,242,54,0.35))' : 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: tab.active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Region Sheet */}
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
              <button onClick={useCurrentLocation} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
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
