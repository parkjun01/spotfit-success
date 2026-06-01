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
const SPORT_EMOJIS: Record<string, string> = {
  '축구': '⚽', '풋살': '⚽', '농구': '🏀', '야구': '⚾', '배드민턴': '🏸',
  '테니스': '🎾', '탁구': '🏓', '수영': '🏊', '러닝': '🏃', '등산': '🧗',
  '클라이밍': '🧗', '요가': '🧘', '필라테스': '🤸', '헬스': '💪', '골프': '⛳',
  '볼링': '🎳', '배구': '🏐', '핸드볼': '🤾',
};

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
  const [joined, setJoined] = useState(false);
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
      setJoined(true);
      setTimeout(() => router.push(`/spots/${id}/chat`), 1200);
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

  const openExternalMap = (type: 'kakao' | 'naver' | 'google') => {
    const openWithLocation = (sLat: number, sLng: number) => {
      const dLat = spot.latitude;
      const dLng = spot.longitude;
      const dName = encodeURIComponent(spot.location_name);
      const urls: Record<string, string> = {
        kakao: `https://map.kakao.com/link/from/내위치,${sLat},${sLng}/to/${spot.location_name},${dLat},${dLng}`,
        naver: `https://map.naver.com/index.nhn?slng=${sLng}&slat=${sLat}&stext=현재위치&elng=${dLng}&elat=${dLat}&etext=${dName}&menu=route&pathType=0`,
        google: `https://www.google.com/maps/dir/?api=1&origin=${sLat},${sLng}&destination=${dLat},${dLng}&travelmode=walking`,
      };
      window.open(urls[type], '_blank');
    };

    navigator.geolocation.getCurrentPosition(
      pos => openWithLocation(pos.coords.latitude, pos.coords.longitude),
      () => {
        // 위치 권한 거부 시 목적지만으로 열기
        const dLat = spot.latitude;
        const dLng = spot.longitude;
        const dName = encodeURIComponent(spot.location_name);
        const fallbacks: Record<string, string> = {
          kakao: `https://map.kakao.com/link/to/${spot.location_name},${dLat},${dLng}`,
          naver: `https://map.naver.com/index.nhn?elng=${dLng}&elat=${dLat}&etext=${dName}&menu=route`,
          google: `https://www.google.com/maps/dir/?api=1&destination=${dLat},${dLng}&travelmode=walking`,
        };
        window.open(fallbacks[type], '_blank');
      },
      { timeout: 5000 }
    );
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#131314' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  if (!spot) return <div style={{ textAlign: 'center', padding: '80px 0', color: '#8A8A9A', background: '#131314', minHeight: '100vh' }}>스팟을 찾을 수 없습니다</div>;

  const sportColor = getSportColor(spot.sports?.name);
  const mannerScore = spot.users?.manner_score;
  const participants = spot.participations?.filter((p: any) => p.status === 'joined') || [];
  const isFull = spot.status === 'full';
  const isHost = myUserId && spot.host_id === myUserId;
  const isParticipating = myUserId && participants.some((p: any) => p.user_id === myUserId);
  const canJoin = !isFull && spot.status === 'recruiting' && !isParticipating && !isHost;
  const isActive = ['recruiting', 'full'].includes(spot.status);
  const fillPct = Math.min(100, Math.round((spot.current_participants / spot.max_participants) * 100));

  const S = {
    page: { minHeight: '100vh', background: '#0A0A0B', paddingBottom: 100 } as React.CSSProperties,
    header: { position: 'sticky' as const, top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 64, background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(12px)', borderBottom: 'none' },
    card: { background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, marginBottom: 12 } as React.CSSProperties,
    label: { fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#8A8A9A', marginBottom: 6 },
    infoCell: { background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 12, padding: 12 } as React.CSSProperties,
  };

  return (
    <div style={S.page}>

      {/* Header */}
      <header style={S.header}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.06em' }}>SPOT DETAILS</h1>
        {/* more_vert button — spot-details.html */}
        <button style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', cursor: 'pointer', border: 'none' }}
          onClick={() => isHost && isActive && router.push(`/spots/${id}/edit`)}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{isHost && isActive ? 'edit' : 'more_vert'}</span>
        </button>
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', height: 280, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0a1a00,#001a1a,#0a0a0b)', fontSize: 80 }}>
        {SPORT_EMOJIS[spot.sports?.name] || '🏅'}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(10,10,11,0) 0%,rgba(10,10,11,0.8) 68%,rgba(10,10,11,1) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 24, left: 16 }}>
          <span style={{ display: 'inline-block', padding: '4px 12px', background: isFull ? '#3E3E4A' : '#c9f236', color: isFull ? '#8A8A9A' : '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: 2, marginBottom: 10 }}>
            {STATUS_MAP[spot.status]}
          </span>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, lineHeight: 1.0, color: '#ffffef', textTransform: 'uppercase' }}>{spot.title}</h2>
        </div>
      </section>

      <div style={{ padding: '0 16px' }}>

        {/* Host Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', borderBottom: '1px solid #2A2A32', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E1E22', border: '1px solid #2A2A32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: '#c9f236' }}>
              {spot.users?.nickname?.[0]}
            </div>
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#c9f236' }}>
                {spot.users?.nickname}{isHost && <span style={{ color: '#8A8A9A', fontWeight: 500 }}> (나)</span>}
              </p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', color: '#8A8A9A' }}>Host</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#c9f236', letterSpacing: '0.05em' }}>Manner Score {mannerScore?.toFixed(1)}</p>
            <div style={{ width: 120, height: 4, background: '#1E1E22', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (mannerScore / 50) * 100)}%`, background: '#22C55E', borderRadius: 999 }} />
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { icon: 'calendar_today', label: '일시', value: format(new Date(spot.starts_at), 'M월 d일 HH:mm', { locale: ko }) },
            { icon: 'location_on', label: '장소', value: spot.location_name },
            { icon: 'group', label: '인원', value: `${spot.current_participants} / ${spot.max_participants} 명` },
            { icon: 'sports', label: '종목', value: spot.sports?.name },
          ].map(({ icon, label, value }) => (
            <div key={label} style={S.infoCell}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#c9f236', display: 'block', marginBottom: 6 }}>{icon}</span>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 2 }}>{label}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#ffffef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tags */}
        {spot.spot_tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {spot.spot_tags.map((st: any) => (
              <span key={st.tags?.id} style={{ padding: '6px 14px', background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 500, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                #{st.tags?.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {spot.description && (
          <div style={S.card}>
            <p style={S.label}>Description</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, lineHeight: 1.65, color: '#8A8A9A' }}>{spot.description}</p>
          </div>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <div style={S.card}>
            <p style={S.label}>Participants</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {participants.map((p: any) => (
                <div key={p.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #0A0A0B', background: p.user_id === spot.host_id ? '#c9f236' : '#1E1E22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: p.user_id === spot.host_id ? '#171e00' : '#e5e2e3' }}>
                    {p.users?.nickname?.[0]}
                  </div>
                  <span style={{ fontSize: 11, color: '#8A8A9A', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{p.users?.nickname}</span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, spot.max_participants - participants.length) }).map((_, i) => (
                <div key={`empty-${i}`} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px dashed #2A2A32', background: 'transparent' }} />
              ))}
            </div>
          </div>
        )}

        {/* Route */}
        {spot.latitude && spot.longitude && (
          <div style={S.card}>
            <p style={S.label}>길 안내</p>
            <p style={{ fontSize: 12, color: '#8A8A9A', marginBottom: 12 }}>{spot.location_name}</p>
            <button
              onClick={handleShowRoute}
              disabled={routeLoading}
              style={{ width: '100%', height: 44, borderRadius: 10, marginBottom: 12, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: showRoute ? '#2a2a2b' : '#c9f236', color: showRoute ? '#8A8A9A' : '#171e00', transition: 'all 0.2s' }}
            >
              {routeLoading ? <>
                <div style={{ width: 16, height: 16, border: '2px solid #171e00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                위치 확인 중...
              </> : showRoute ? '경로 닫기 ✕' : '🗺 경로 보기'}
            </button>
            {showRoute && routeData && (
              <div style={{ marginBottom: 12 }}>
                <RouteMap
                  start={routeData.start}
                  end={{ lat: spot.latitude, lng: spot.longitude, name: spot.location_name }}
                  routeCoords={routeData.coords}
                  distance={routeData.distance}
                  duration={routeData.duration}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { type: 'kakao', label: '카카오맵', bg: '#FEE500', color: '#3C1E1E' },
                { type: 'naver', label: '네이버', bg: '#03C75A', color: '#fff' },
                { type: 'google', label: '구글', bg: '#4285F4', color: '#fff' },
              ] as const).map(({ type, label, bg, color }) => (
                <button key={type} onClick={() => openExternalMap(type)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, background: bg, color, border: 'none', cursor: 'pointer', transition: 'transform 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Evaluate */}
        {spot.status === 'completed' && isParticipating && (
          <Link href={`/spots/${id}/evaluate`}>
            <div style={{ ...S.card, background: 'rgba(201,242,54,0.08)', borderColor: 'rgba(201,242,54,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#c9f236', fontSize: 15 }}>평가하기</p>
                <p style={{ fontSize: 12, color: '#8A8A9A' }}>함께한 팀원들을 평가해주세요</p>
              </div>
              <span style={{ color: '#c9f236', fontSize: 20 }}>›</span>
            </div>
          </Link>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 448, padding: 16, background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2A2A32', zIndex: 50, display: 'flex', gap: 10 }}>
        <Link href={`/spots/${id}/chat`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 52, borderRadius: 12, border: '1px solid #2A2A32', color: '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 14, background: '#1E1E22', flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chat</span>채팅
        </Link>

        {isHost && isActive ? (
          <button onClick={handleCancelSpot} disabled={cancelling} style={{ flex: 1, height: 52, borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', cursor: 'pointer' }}>
            {cancelling ? '취소 중...' : '스팟 취소'}
          </button>
        ) : isParticipating && isActive ? (
          <button onClick={handleLeave} disabled={leaving} style={{ flex: 1, height: 52, borderRadius: 12, border: '1px solid #2A2A32', background: '#1E1E22', color: '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', cursor: 'pointer' }}>
            {leaving ? '처리 중...' : '참여 취소'}
          </button>
        ) : canJoin ? (
          <button onClick={handleJoin} disabled={joining || joined} style={{ flex: 1, height: 52, borderRadius: 12, background: joined ? '#22C55E' : '#c9f236', color: joined ? '#fff' : '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: joined ? 'default' : 'pointer', transition: 'background 0.3s, transform 0.15s' }}>
            {joining ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid #171e00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              </span>
            ) : joined ? '✓ CONFIRMED' : 'JOIN NOW'}
          </button>
        ) : (
          <button disabled style={{ flex: 1, height: 52, borderRadius: 12, background: '#1E1E22', color: '#3E3E4A', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', border: '1px solid #2A2A32', cursor: 'not-allowed' }}>
            {isFull ? '마감된 스팟' : STATUS_MAP[spot.status]}
          </button>
        )}
      </div>
    </div>
  );
}
