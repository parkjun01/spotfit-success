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
}

const SPORT_COLORS: Record<string, string> = {
  '축구': '#16A34A', '풋살': '#22C55E', '농구': '#EA580C', '야구': '#2563EB',
  '배드민턴': '#9333EA', '테니스': '#CA8A04', '탁구': '#0891B2', '수영': '#06B6D4',
  '러닝': '#DC2626', '등산': '#78350F', '클라이밍': '#C2410C', '요가': '#DB2777',
  '필라테스': '#EC4899', '헬스': '#475569', '골프': '#15803D', '볼링': '#7C3AED',
  '배구': '#D97706', '핸드볼': '#0D9488',
};
const getSportColor = (name: string) => SPORT_COLORS[name] || '#c9f236';

function dotSvgUrl(color: string, cur: number, max: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <circle cx="22" cy="22" r="19" fill="${color}" stroke="#0A0A0B" stroke-width="3"/>
    <text x="22" y="27" text-anchor="middle" fill="white" font-size="11" font-family="Arial,sans-serif" font-weight="bold">${cur}/${max}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '405d8f53f98c26fe032e16aef77ee8d7';

const PULSE_HTML = `
  <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(201,242,54,0.35);animation:pulsering 2s ease-out infinite;pointer-events:none;"></div>
    <div style="width:16px;height:16px;background:#c9f236;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 8px rgba(201,242,54,0.6);position:relative;z-index:1;pointer-events:none;"></div>
  </div>`;

function waitForKakao(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 로드됨
    if ((window as any).kakao?.maps) { resolve(); return; }

    // 스크립트 주입
    if (!document.querySelector(`script[src*="dapi.kakao.com/v2/maps"]`)) {
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}`;
      s.async = true;
      document.head.appendChild(s);
    }

    // 준비될 때까지 폴링
    let tries = 0;
    const t = setInterval(() => {
      if ((window as any).kakao?.maps) { clearInterval(t); resolve(); return; }
      if (++tries > 100) { clearInterval(t); reject(new Error('Kakao Maps 로드 시간 초과')); }
    }, 100);
  });
}

export default function SpotMap({ spots, center, onSpotClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const locationOverlayRef = useRef<any>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    waitForKakao().then(() => setReady(true)).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = (window as any).kakao;
    const lat = center?.lat ?? 37.5665;
    const lng = center?.lng ?? 126.9780;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(lat, lng),
        level: 7,
      });
    } else {
      mapInstanceRef.current.setCenter(new kakao.maps.LatLng(lat, lng));
    }

    if (locationOverlayRef.current) { locationOverlayRef.current.setMap(null); locationOverlayRef.current = null; }
    if (center) {
      const overlay = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(lat, lng), content: PULSE_HTML, zIndex: 15 });
      overlay.setMap(mapInstanceRef.current);
      locationOverlayRef.current = overlay;
    }
  }, [ready, center?.lat, center?.lng]);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const kakao = (window as any).kakao;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    spots.forEach(spot => {
      if (!spot.latitude || !spot.longitude) return;
      const isFull = spot.status === 'full';
      const isClosing = !isFull && spot.current_participants / spot.max_participants >= 0.8;
      const color = isFull ? '#3E3E4A' : isClosing ? '#fd591e' : getSportColor(spot.sport_name);
      const img = new kakao.maps.MarkerImage(dotSvgUrl(color, spot.current_participants, spot.max_participants), new kakao.maps.Size(44, 44), { offset: new kakao.maps.Point(22, 22) });
      const marker = new kakao.maps.Marker({ position: new kakao.maps.LatLng(spot.latitude, spot.longitude), image: img, map: mapInstanceRef.current, title: spot.title });
      kakao.maps.event.addListener(marker, 'click', () => { if (onSpotClick) onSpotClick(spot); else router.push(`/spots/${spot.id}`); });
      markersRef.current.push(marker);
    });
  }, [ready, spots]);

  if (error) return (
    <div style={{ width: '100%', height: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0E0E0F', gap: 12 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#3E3E4A' }}>map_off</span>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, color: '#8A8A9A', textAlign: 'center' }}>지도를 불러올 수 없습니다<br/><span style={{ fontSize: 12, color: '#3E3E4A' }}>{error}</span></p>
    </div>
  );

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '100vh', background: '#0E0E0F' }} />
  );
}
