'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Spot {
  id: string; title: string; sport_name: string; location_name: string;
  latitude: number; longitude: number; current_participants: number;
  max_participants: number; status: string; starts_at: string;
  host_nickname: string; host_manner_score: number; distance_meters?: number;
  difficulty_level: string;
}
interface Props {
  spots: Spot[];
  center?: { lat: number; lng: number };
  onSpotClick?: (spot: Spot) => void;
  userLocation?: { lat: number; lng: number };
  onPopupChange?: (open: boolean) => void;
}

// 종목별 색상
const SPORT_COLORS: Record<string, string> = {
  '축구': '#16A34A', '풋살': '#22C55E', '농구': '#EA580C', '야구': '#2563EB',
  '배드민턴': '#9333EA', '테니스': '#CA8A04', '탁구': '#0891B2', '수영': '#06B6D4',
  '러닝': '#DC2626', '등산': '#78350F', '클라이밍': '#C2410C', '요가': '#DB2777',
  '필라테스': '#EC4899', '헬스': '#475569', '골프': '#15803D', '볼링': '#7C3AED',
  '배구': '#D97706', '핸드볼': '#0D9488',
};
const getSportColor = (n?: string) => (n && SPORT_COLORS[n]) || '#c9f236';

// 종목별 이모지
const SPORT_EMOJIS: Record<string, string> = {
  '축구': '⚽', '풋살': '⚽', '농구': '🏀', '야구': '⚾', '배드민턴': '🏸',
  '테니스': '🎾', '탁구': '🏓', '수영': '🏊', '러닝': '🏃', '등산': '🧗',
  '클라이밍': '🧗', '요가': '🧘', '필라테스': '🤸', '헬스': '💪', '골프': '⛳',
  '볼링': '🎳', '배구': '🏐', '핸드볼': '🤾',
};

function markerSvg(color: string, emoji: string, cur: number, max: number, isFull: boolean) {
  const textColor = isFull ? '#aaa' : 'white';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="60">
      <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.4"/></filter>
      <ellipse cx="26" cy="56" rx="10" ry="4" fill="rgba(0,0,0,0.25)"/>
      <path d="M26 2 C12 2 4 12 4 23 C4 38 26 54 26 54 C26 54 48 38 48 23 C48 12 40 2 26 2Z" fill="${color}" stroke="#0A0A0B" stroke-width="2.5" filter="url(#sh)"/>
      <text x="26" y="21" text-anchor="middle" fill="${textColor}" font-size="16" font-family="Arial">${emoji}</text>
      <text x="26" y="35" text-anchor="middle" fill="${textColor}" font-size="10" font-family="Arial" font-weight="bold">${cur}/${max}</text>
    </svg>`
  );
}

// 현재 위치 마커 SVG
const MY_LOCATION_SVG = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
    <circle cx="20" cy="20" r="18" fill="rgba(201,242,54,0.2)" stroke="#c9f236" stroke-width="2"/>
    <circle cx="20" cy="20" r="8" fill="#c9f236" stroke="white" stroke-width="2.5"/>
  </svg>`
);

export default function SpotMap({ spots, center, onSpotClick, userLocation, onPopupChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const myMarkerRef = useRef<any>(null);
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // 현재 위치 자동 감지
  useEffect(() => {
    if (userLocation) { setMyLoc(userLocation); return; }
    navigator.geolocation?.getCurrentPosition(
      pos => setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, [userLocation]);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    const initMap = () => {
      if (!mapRef.current) return;
      const kakao = (window as any).kakao;
      try {
        const lat = center?.lat ?? 37.5665;
        const lng = center?.lng ?? 126.978;
        mapInstanceRef.current = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(lat, lng),
          level: 6,
        });
        setStatus('ready');
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(`지도 생성 오류: ${e?.message}`);
      }
    };

    let attempts = 0;
    const MAX = 100;
    const tryInit = () => {
      const kakao = (window as any).kakao;
      if (!kakao) {
        attempts++;
        if (attempts >= MAX) { setStatus('error'); setErrorMsg('kakao 객체 없음 — 스크립트 로드 실패'); }
        else setTimeout(tryInit, 100);
        return;
      }
      if (!kakao.maps) {
        attempts++;
        if (attempts >= MAX) { setStatus('error'); setErrorMsg('kakao.maps 없음 — 도메인 미등록 또는 잘못된 키'); }
        else setTimeout(tryInit, 100);
        return;
      }
      if (!kakao.maps.Map) {
        if (typeof kakao.maps.load === 'function') { kakao.maps.load(initMap); }
        else { setStatus('error'); setErrorMsg('kakao.maps.load 없음'); }
        return;
      }
      initMap();
    };
    tryInit();
  }, []);

  // 센터 변경 시 지도 이동
  useEffect(() => {
    if (status !== 'ready' || !mapInstanceRef.current || !center) return;
    const kakao = (window as any).kakao;
    mapInstanceRef.current.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
  }, [center?.lat, center?.lng, status]);

  // 현재 위치 마커
  useEffect(() => {
    if (status !== 'ready' || !myLoc) return;
    const kakao = (window as any).kakao;
    if (myMarkerRef.current) myMarkerRef.current.setMap(null);
    const img = new kakao.maps.MarkerImage(
      MY_LOCATION_SVG,
      new kakao.maps.Size(40, 40), { offset: new kakao.maps.Point(20, 20) }
    );
    myMarkerRef.current = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(myLoc.lat, myLoc.lng),
      image: img,
      map: mapInstanceRef.current,
      title: '내 위치',
      zIndex: 10,
    });
  }, [myLoc, status]);

  // 스팟 마커 업데이트
  useEffect(() => {
    if (status !== 'ready' || !mapInstanceRef.current) return;
    const kakao = (window as any).kakao;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    spots.forEach(spot => {
      if (!spot.latitude || !spot.longitude) return;
      const isFull = spot.status === 'full';
      const closing = !isFull && spot.current_participants / spot.max_participants >= 0.8;
      const color = isFull ? '#3E3E4A' : closing ? '#fd591e' : getSportColor(spot.sport_name);
      const emoji = SPORT_EMOJIS[spot.sport_name] || '🏅';

      const img = new kakao.maps.MarkerImage(
        markerSvg(color, emoji, spot.current_participants, spot.max_participants, isFull),
        new kakao.maps.Size(52, 60), { offset: new kakao.maps.Point(26, 54) }
      );
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(spot.latitude, spot.longitude),
        image: img, map: mapInstanceRef.current, title: spot.title,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedSpot(spot);
        onPopupChange?.(true);
      });
      markersRef.current.push(marker);
    });
  }, [spots, status]);

  // 현재 위치로 이동
  const goToMyLocation = () => {
    if (!myLoc || !mapInstanceRef.current) {
      navigator.geolocation?.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLoc(loc);
          const kakao = (window as any).kakao;
          mapInstanceRef.current?.setCenter(new kakao.maps.LatLng(loc.lat, loc.lng));
          mapInstanceRef.current?.setLevel(5);
        },
        () => alert('위치 권한을 허용해주세요')
      );
      return;
    }
    const kakao = (window as any).kakao;
    mapInstanceRef.current.setCenter(new kakao.maps.LatLng(myLoc.lat, myLoc.lng));
    mapInstanceRef.current.setLevel(5);
  };

  // 지도 확대/축소
  const zoomIn = () => { if (mapInstanceRef.current) { const kakao = (window as any).kakao; mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() - 1); } };
  const zoomOut = () => { if (mapInstanceRef.current) { const kakao = (window as any).kakao; mapInstanceRef.current.setLevel(mapInstanceRef.current.getLevel() + 1); } };

  // 현재 지도에 보이는 종목 목록 (범례용)
  const visibleSports = Array.from(new Set(spots.map(s => s.sport_name))).slice(0, 6);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '100vh' }} />

      {/* 오류 */}
      {status === 'error' && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, width: 'min(90vw, 440px)', background: '#0F0F14', color: '#f87171', borderRadius: 14, padding: '20px', fontSize: 13, lineHeight: 1.7, border: '2px solid #ef4444', wordBreak: 'break-all', boxShadow: '0 0 40px rgba(239,68,68,0.3)' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>🗺️ 지도 오류</div>
          <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '10px 12px' }}>{errorMsg}</div>
        </div>
      )}

      {status === 'loading' && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 99999, color: '#8A8A9A', fontSize: 14, pointerEvents: 'none' }}>
          지도 로딩 중...
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* 우측 컨트롤 버튼들 */}
          <div style={{ position: 'absolute', right: 12, bottom: 200, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* 줌 인 */}
            <button onClick={zoomIn} style={{ width: 40, height: 40, background: 'rgba(20,20,22,0.92)', border: '1px solid #2A2A32', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e2e3', cursor: 'pointer', backdropFilter: 'blur(8px)', fontSize: 20, fontWeight: 700 }}>+</button>
            {/* 줌 아웃 */}
            <button onClick={zoomOut} style={{ width: 40, height: 40, background: 'rgba(20,20,22,0.92)', border: '1px solid #2A2A32', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e2e3', cursor: 'pointer', backdropFilter: 'blur(8px)', fontSize: 20, fontWeight: 700 }}>−</button>
            {/* 현재 위치 */}
            <button onClick={goToMyLocation} style={{ width: 40, height: 40, background: myLoc ? '#c9f236' : 'rgba(20,20,22,0.92)', border: `1px solid ${myLoc ? '#c9f236' : '#2A2A32'}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', fontSize: 18 }}>
              📍
            </button>
            {/* 범례 토글 */}
            <button onClick={() => setShowLegend(v => !v)} style={{ width: 40, height: 40, background: showLegend ? 'rgba(201,242,54,0.15)' : 'rgba(20,20,22,0.92)', border: `1px solid ${showLegend ? '#c9f236' : '#2A2A32'}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', fontSize: 16 }}>
              🎨
            </button>
          </div>

          {/* 종목 범례 */}
          {showLegend && visibleSports.length > 0 && (
            <div style={{ position: 'absolute', right: 60, bottom: 200, zIndex: 30, background: 'rgba(14,14,15,0.94)', border: '1px solid #2A2A32', borderRadius: 12, padding: '10px 12px', backdropFilter: 'blur(8px)', minWidth: 120 }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#8A8A9A', marginBottom: 6, letterSpacing: '0.08em' }}>종목 색상</p>
              {visibleSports.map(sport => (
                <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: getSportColor(sport), flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>{sport}</span>
                  <span style={{ fontSize: 12 }}>{SPORT_EMOJIS[sport]}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, marginTop: 4, paddingTop: 4, borderTop: '1px solid #2A2A32' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fd591e', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>마감임박</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3E3E4A', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, color: '#e5e2e3' }}>마감</span>
              </div>
            </div>
          )}

          {/* 스팟 클릭 팝업 — position:fixed로 정확한 하단 고정 */}
          {selectedSpot && (
            <div style={{ position: 'fixed', bottom: 88, left: 12, right: 12, zIndex: 999, background: 'rgba(14,14,15,0.98)', border: '1px solid rgba(201,242,54,0.3)', borderRadius: 18, padding: '14px 16px', backdropFilter: 'blur(16px)', boxShadow: '0 -4px 32px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: getSportColor(selectedSpot.sport_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {SPORT_EMOJIS[selectedSpot.sport_name] || '🏅'}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#ffffef', lineHeight: 1.2 }}>{selectedSpot.title}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#c9f236', fontWeight: 600, textTransform: 'uppercase' }}>{selectedSpot.sport_name}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedSpot(null); onPopupChange?.(false); }} style={{ background: '#1E1E22', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8A8A9A', fontSize: 16 }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: '#8A8A9A' }}>
                <span>📍 {selectedSpot.location_name}</span>
                <span>👥 {selectedSpot.current_participants}/{selectedSpot.max_participants}</span>
                {selectedSpot.distance_meters != null && (
                  <span>🗺 {selectedSpot.distance_meters < 1000 ? `${Math.round(selectedSpot.distance_meters)}m` : `${(selectedSpot.distance_meters / 1000).toFixed(1)}km`}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, background: '#1E1E22', borderRadius: 8, padding: '6px 10px' }}>
                  <span style={{ fontSize: 12, color: '#8A8A9A' }}>매너</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#c9f236' }}>★ {selectedSpot.host_manner_score?.toFixed(1)}</span>
                </div>
                <button
                  onClick={() => { if (onSpotClick) onSpotClick(selectedSpot); else router.push(`/spots/${selectedSpot.id}`); }}
                  style={{ flex: 2, background: '#c9f236', border: 'none', borderRadius: 8, padding: '8px 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#171e00', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  상세 보기 →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
