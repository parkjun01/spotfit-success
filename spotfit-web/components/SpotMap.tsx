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
const getSportColor = (n?: string) => (n && SPORT_COLORS[n]) || '#c9f236';

function markerSvg(color: string, cur: number, max: number) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><circle cx="22" cy="22" r="19" fill="${color}" stroke="#0A0A0B" stroke-width="3"/><text x="22" y="27" text-anchor="middle" fill="white" font-size="11" font-family="Arial" font-weight="bold">${cur}/${max}</text></svg>`
  );
}

const PULSE = `<div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(201,242,54,0.35);animation:pulsering 2s ease-out infinite;"></div><div style="width:16px;height:16px;background:#c9f236;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 8px rgba(201,242,54,0.6);position:relative;z-index:1;"></div></div>`;

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '405d8f53f98c26fe032e16aef77ee8d7';

let kakaoLoadPromise: Promise<void> | null = null;

function loadKakaoSDK(): Promise<void> {
  if (kakaoLoadPromise) return kakaoLoadPromise;

  const win = window as any;

  // 이미 로드된 경우
  if (win.kakao?.maps) {
    kakaoLoadPromise = Promise.resolve();
    return kakaoLoadPromise;
  }

  kakaoLoadPromise = new Promise((resolve, reject) => {
    // autoload=false로 스크립트 주입
    const existing = document.querySelector('script[src*="dapi.kakao.com/v2/maps"]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`;
      s.onerror = () => reject(new Error(`Kakao SDK 스크립트 로드 실패 (네트워크 오류 또는 잘못된 키)`));
      s.onload = () => {
        const k = (window as any).kakao;
        if (!k) {
          reject(new Error('kakao 객체가 없음 — 키 확인 필요'));
          return;
        }
        if (!k.maps) {
          reject(new Error('kakao.maps 없음 — 도메인 미등록 가능성'));
          return;
        }
        k.maps.load(() => resolve());
      };
      document.head.appendChild(s);
    } else {
      // 스크립트는 있지만 maps가 아직 없는 경우 — kakao.maps.load 대기
      const wait = setInterval(() => {
        const k = (window as any).kakao;
        if (k?.maps?.load) {
          clearInterval(wait);
          k.maps.load(() => resolve());
        }
      }, 100);
      setTimeout(() => { clearInterval(wait); reject(new Error('kakao.maps.load 타임아웃')); }, 8000);
    }
  });

  return kakaoLoadPromise;
}

export default function SpotMap({ spots, center, onSpotClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlayRef = useRef<any>(null);
  const router = useRouter();
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;
    setMapError(null);

    loadKakaoSDK()
      .then(() => {
        if (!mapRef.current) return;
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
        setMapReady(true);

        // 현재 위치 펄스
        if (overlayRef.current) overlayRef.current.setMap(null);
        if (center) {
          overlayRef.current = new kakao.maps.CustomOverlay({
            position: new kakao.maps.LatLng(lat, lng),
            content: PULSE,
            zIndex: 15,
          });
          overlayRef.current.setMap(mapInstanceRef.current);
        }
      })
      .catch((err: Error) => {
        setMapError(err.message);
        kakaoLoadPromise = null; // 다음에 재시도 가능하도록 초기화
      });
  }, [center?.lat, center?.lng]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
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
        image: img, map: mapInstanceRef.current, title: spot.title,
      });
      kakao.maps.event.addListener(marker, 'click', () => {
        if (onSpotClick) onSpotClick(spot); else router.push(`/spots/${spot.id}`);
      });
      markersRef.current.push(marker);
    });
  }, [spots, mapReady]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '100vh' }} />
      {mapError && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 99999,
          width: 'min(90vw, 420px)',
          background: '#0F0F14', color: '#f87171', borderRadius: 14,
          padding: '20px 20px', fontSize: 13, lineHeight: 1.7,
          border: '2px solid #ef4444', wordBreak: 'break-all',
          boxShadow: '0 0 40px rgba(239,68,68,0.3)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>🗺️ 지도 로드 오류</div>
          <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>{mapError}</div>
          <div style={{ color: '#6B7280', fontSize: 11 }}>키: {KEY}</div>
        </div>
      )}
      {!mapReady && !mapError && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 99999,
          color: '#8A8A9A', fontSize: 14, textAlign: 'center', pointerEvents: 'none',
        }}>
          지도 로딩 중...
        </div>
      )}
    </div>
  );
}
