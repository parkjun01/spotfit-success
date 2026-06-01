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

const PULSE_HTML = `
  <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(201,242,54,0.35);animation:pulsering 2s ease-out infinite;pointer-events:none;"></div>
    <div style="width:16px;height:16px;background:#c9f236;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 8px rgba(201,242,54,0.6);position:relative;z-index:1;pointer-events:none;"></div>
  </div>`;

// 카카오맵 SDK를 직접 로드하는 함수 (layout Script 의존 제거)
function loadKakaoSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    const kakao = (window as any).kakao;
    if (kakao?.maps) { resolve(); return; }

    // 이미 스크립트가 로드 중인지 확인
    const existing = document.querySelector('script[src*="dapi.kakao.com/v2/maps"]');
    if (existing) {
      // 이미 있으면 로드 완료 대기
      const wait = setInterval(() => {
        if ((window as any).kakao?.maps) { clearInterval(wait); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(wait); reject(new Error('SDK load timeout')); }, 10000);
      return;
    }

    const appkey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '405d8f53f98c26fe032e16aef77ee8d7';
    if (!appkey) { reject(new Error('NEXT_PUBLIC_KAKAO_JS_KEY is not set')); return; }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      (window as any).kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error('Kakao Maps SDK failed to load'));
    document.head.appendChild(script);
  });
}

export default function SpotMap({ spots, center, onSpotClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const locationOverlayRef = useRef<any>(null);
  const router = useRouter();
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // SDK 로드
  useEffect(() => {
    loadKakaoSDK()
      .then(() => setSdkLoaded(true))
      .catch(e => setSdkError(e.message));
  }, []);

  // 지도 초기화 + 위치 펄스
  useEffect(() => {
    if (!sdkLoaded || !mapRef.current) return;
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
  }, [sdkLoaded, center?.lat, center?.lng]);

  // 마커
  useEffect(() => {
    if (!sdkLoaded || !mapInstanceRef.current) return;
    const kakao = (window as any).kakao;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    spots.forEach(spot => {
      if (!spot.latitude || !spot.longitude) return;
      const isFull = spot.status === 'full';
      const isClosing = !isFull && spot.current_participants / spot.max_participants >= 0.8;
      const color = isFull ? '#3E3E4A' : isClosing ? '#fd591e' : getSportColor(spot.sport_name);

      const img = new kakao.maps.MarkerImage(
        dotSvgUrl(color, spot.current_participants, spot.max_participants),
        new kakao.maps.Size(44, 44), { offset: new kakao.maps.Point(22, 22) }
      );
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(spot.latitude, spot.longitude),
        image: img, map: mapInstanceRef.current, title: spot.title,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        if (onSpotClick) onSpotClick(spot); else router.push(`/spots/${spot.id}`);
      });
      markersRef.current.push(marker);
    });
  }, [sdkLoaded, spots]);

  if (sdkError) return (
    <div style={{ width: '100%', height: '100%', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0E0E0F', gap: 12 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#3E3E4A' }}>map_off</span>
      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, color: '#8A8A9A', textAlign: 'center', padding: '0 32px' }}>
        지도를 불러올 수 없습니다<br/>
        <span style={{ fontSize: 12, color: '#3E3E4A' }}>{sdkError}</span>
      </p>
    </div>
  );

  if (!sdkLoaded) return (
    <div style={{ width: '100%', height: '100%', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0E0E0F' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '100dvh' }} />;
}
