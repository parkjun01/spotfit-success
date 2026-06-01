'use client';
import { useEffect, useRef } from 'react';

interface Props {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number; name: string };
  routeCoords: [number, number][];
  distance: number;
  duration: number;
}

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '41f7052cc54daa806a96d14075ab4d57';

function dotSvg(color: string) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="${color}" stroke="#0A0A0B" stroke-width="2.5"/></svg>`
  );
}

export default function RouteMap({ start, end, routeCoords, distance, duration }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const distKm = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  const minutes = Math.round(duration / 60);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!document.querySelector('script[src*="dapi.kakao.com/v2/maps"]')) {
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}`;
      document.head.appendChild(s);
    }

    let done = false;
    const init = () => {
      if (done || !mapRef.current) return;
      done = true;
      const kakao = (window as any).kakao;

      const map = new kakao.maps.Map(mapRef.current, {
        center: new kakao.maps.LatLng(start.lat, start.lng),
        level: 5,
      });

      if (routeCoords.length > 0) {
        const path = routeCoords.map(([la, ln]) => new kakao.maps.LatLng(la, ln));
        new kakao.maps.Polyline({ map, path, strokeWeight: 5, strokeColor: '#c9f236', strokeOpacity: 0.9, strokeStyle: 'solid' });
        const bounds = new kakao.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        map.setBounds(bounds);
      }

      new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(start.lat, start.lng), image: new kakao.maps.MarkerImage(dotSvg('#3B82F6'), new kakao.maps.Size(20, 20), { offset: new kakao.maps.Point(10, 10) }) });
      new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(end.lat, end.lng), image: new kakao.maps.MarkerImage(dotSvg('#c9f236'), new kakao.maps.Size(20, 20), { offset: new kakao.maps.Point(10, 10) }) });
    };

    if ((window as any).kakao?.maps) { init(); return; }
    const t = setInterval(() => {
      if ((window as any).kakao?.maps) { clearInterval(t); init(); }
    }, 150);
    return () => clearInterval(t);
  }, [start, end, routeCoords]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#60A5FA', lineHeight: 1 }}>{distKm}</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', marginTop: 4 }}>거리</p>
        </div>
        <div style={{ flex: 1, background: 'rgba(201,242,54,0.08)', border: '1px solid rgba(201,242,54,0.25)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#c9f236', lineHeight: 1 }}>{minutes}분</p>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', marginTop: 4 }}>도보 예상</p>
        </div>
      </div>
      <div ref={mapRef} style={{ height: 260, borderRadius: 12 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8A8A9A' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />내 위치
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8A8A9A' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#c9f236', display: 'inline-block' }} />{end.name}
        </span>
      </div>
    </div>
  );
}
