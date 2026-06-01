'use client';
import { useEffect, useRef } from 'react';
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
const getSportColor = (n: string) => SPORT_COLORS[n] || '#c9f236';

function markerSvg(color: string, cur: number, max: number) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><circle cx="22" cy="22" r="19" fill="${color}" stroke="#0A0A0B" stroke-width="3"/><text x="22" y="27" text-anchor="middle" fill="white" font-size="11" font-family="Arial" font-weight="bold">${cur}/${max}</text></svg>`
  );
}

const PULSE = `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(201,242,54,0.35);animation:pulsering 2s ease-out infinite;"></div><div style="width:16px;height:16px;background:#c9f236;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 8px rgba(201,242,54,0.6);position:relative;z-index:1;"></div></div>`;

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '405d8f53f98c26fe032e16aef77ee8d7';

export default function SpotMap({ spots, center, onSpotClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapRef2 = useRef<any>(null);        // kakao map instance
  const markersRef = useRef<any[]>([]);
  const overlayRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!mapRef.current) return;

    // 1. SDK 스크립트 주입
    if (!document.querySelector('script[src*="dapi.kakao.com/v2/maps"]')) {
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}`;
      document.head.appendChild(s);
    }

    const lat = center?.lat ?? 37.5665;
    const lng = center?.lng ?? 126.9780;
    let done = false;

    // 2. kakao.maps 준비될 때까지 폴링
    const init = () => {
      if (done || !mapRef.current) return;
      done = true;
      const kakao = (window as any).kakao;

      // 지도 초기화 또는 센터 업데이트
      if (!mapRef2.current) {
        mapRef2.current = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(lat, lng),
          level: 7,
        });
      } else {
        mapRef2.current.setCenter(new kakao.maps.LatLng(lat, lng));
      }

      // 현재 위치 펄스
      if (overlayRef.current) overlayRef.current.setMap(null);
      if (center) {
        overlayRef.current = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(lat, lng),
          content: PULSE,
          zIndex: 15,
        });
        overlayRef.current.setMap(mapRef2.current);
      }
    };

    if ((window as any).kakao?.maps) { init(); return; }
    const t = setInterval(() => {
      if ((window as any).kakao?.maps) { clearInterval(t); init(); }
    }, 150);
    return () => clearInterval(t);
  }, [center?.lat, center?.lng]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapRef2.current) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    spots.forEach(spot => {
      if (!spot.latitude || !spot.longitude) return;
      const isFull = spot.status === 'full';
      const closing = !isFull && spot.current_participants / spot.max_participants >= 0.8;
      const color = isFull ? '#3E3E4A' : closing ? '#fd591e' : getSportColor(spot.sport_name);
      const img = new kakao.maps.MarkerImage(
        markerSvg(color, spot.current_participants, spot.max_participants),
        new kakao.maps.Size(44, 44), { offset: new kakao.maps.Point(22, 22) }
      );
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(spot.latitude, spot.longitude),
        image: img, map: mapRef2.current, title: spot.title,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        if (onSpotClick) onSpotClick(spot); else router.push(`/spots/${spot.id}`);
      });
      markersRef.current.push(marker);
    });
  }, [spots, mapRef2.current]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '100vh' }} />
  );
}
