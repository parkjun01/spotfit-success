'use client';
import { useEffect, useRef } from 'react';

interface Props {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number; name: string };
  routeCoords: [number, number][];
  distance: number;
  duration: number;
}

function dotSvgUrl(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
    <circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="3"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function RouteMap({ start, end, routeCoords, distance, duration }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const distKm = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  const minutes = Math.round(duration / 60);

  useEffect(() => {
    const init = () => {
      if (!mapRef.current) return;
      const kakao = (window as any).kakao;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(start.lat, start.lng),
        level: 5,
      });

      if (routeCoords.length > 0) {
        const path = routeCoords.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
        new kakao.maps.Polyline({
          map,
          path,
          strokeWeight: 5,
          strokeColor: '#F97316',
          strokeOpacity: 0.85,
          strokeStyle: 'solid',
        });
        const bounds = new kakao.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        map.setBounds(bounds);
      }

      new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(start.lat, start.lng),
        image: new kakao.maps.MarkerImage(
          dotSvgUrl('#3B82F6'), new kakao.maps.Size(20, 20),
          { offset: new kakao.maps.Point(10, 10) }
        ),
      });
      new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(end.lat, end.lng),
        image: new kakao.maps.MarkerImage(
          dotSvgUrl('#F97316'), new kakao.maps.Size(20, 20),
          { offset: new kakao.maps.Point(10, 10) }
        ),
      });
    };

    if ((window as any).kakao?.maps) { init(); return; }
    const t = setInterval(() => {
      if ((window as any).kakao?.maps) { clearInterval(t); init(); }
    }, 150);
    return () => clearInterval(t);
  }, [start, end, routeCoords]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-blue-600">{distKm}</p>
          <p className="text-xs text-gray-400 mt-0.5">거리</p>
        </div>
        <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-primary">{minutes}분</p>
          <p className="text-xs text-gray-400 mt-0.5">도보 예상</p>
        </div>
      </div>
      <div ref={mapRef} style={{ height: '260px', borderRadius: '12px' }} />
      <div className="flex items-center gap-3 mt-2 px-1">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />내 위치
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block w-3 h-3 rounded-full bg-primary" />{end.name}
        </span>
      </div>
    </div>
  );
}
