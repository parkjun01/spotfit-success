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
const getSportColor = (name: string) => SPORT_COLORS[name] || '#F97316';

function dotSvgUrl(color: string, cur: number, max: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44">
    <circle cx="22" cy="22" r="19" fill="${color}" stroke="white" stroke-width="3"/>
    <text x="22" y="27" text-anchor="middle" fill="white" font-size="11" font-family="Arial,sans-serif" font-weight="bold">${cur}/${max}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function SpotMap({ spots, center, onSpotClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const router = useRouter();

  const onKakaoReady = (cb: () => void) => {
    if ((window as any).kakao?.maps) { cb(); return; }
    const t = setInterval(() => {
      if ((window as any).kakao?.maps) { clearInterval(t); cb(); }
    }, 150);
  };

  useEffect(() => {
    onKakaoReady(() => {
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
    });
  }, [center?.lat, center?.lng]);

  useEffect(() => {
    onKakaoReady(() => {
      if (!mapInstanceRef.current) return;
      const kakao = (window as any).kakao;

      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      spots.forEach(spot => {
        if (!spot.latitude || !spot.longitude) return;
        const isFull = spot.status === 'full';
        const color = isFull ? '#94A3B8' : getSportColor(spot.sport_name);

        const img = new kakao.maps.MarkerImage(
          dotSvgUrl(color, spot.current_participants, spot.max_participants),
          new kakao.maps.Size(44, 44),
          { offset: new kakao.maps.Point(22, 22) }
        );

        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(spot.latitude, spot.longitude),
          image: img,
          map: mapInstanceRef.current,
          title: spot.title,
        });

        kakao.maps.event.addListener(marker, 'click', () => {
          if (onSpotClick) onSpotClick(spot);
          else router.push(`/spots/${spot.id}`);
        });

        markersRef.current.push(marker);
      });
    });
  }, [spots]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}
