'use client';
import { useEffect, useRef, useState } from 'react';

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '405d8f53f98c26fe032e16aef77ee8d7';

function waitForKakao(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).kakao?.maps) { resolve(); return; }
    if (!document.querySelector(`script[src*="dapi.kakao.com/v2/maps"]`)) {
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}`;
      s.async = true;
      document.head.appendChild(s);
    }
    let tries = 0;
    const t = setInterval(() => {
      if ((window as any).kakao?.maps) { clearInterval(t); resolve(); return; }
      if (++tries > 100) { clearInterval(t); reject(new Error('timeout')); }
    }, 100);
  });
}

interface Props {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number; name: string };
  routeCoords: [number, number][];
  distance: number;
  duration: number;
}

function dotSvgUrl(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
    <circle cx="10" cy="10" r="8" fill="${color}" stroke="#0A0A0B" stroke-width="2.5"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function RouteMap({ start, end, routeCoords, distance, duration }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const distKm = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  const minutes = Math.round(duration / 60);

  useEffect(() => {
    waitForKakao().then(() => setReady(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const kakao = (window as any).kakao;

    const map = new kakao.maps.Map(mapRef.current, {
      center: new kakao.maps.LatLng(start.lat, start.lng),
      level: 5,
    });

    if (routeCoords.length > 0) {
      const path = routeCoords.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
      new kakao.maps.Polyline({ map, path, strokeWeight: 5, strokeColor: '#c9f236', strokeOpacity: 0.9, strokeStyle: 'solid' });
      const bounds = new kakao.maps.LatLngBounds();
      path.forEach(p => bounds.extend(p));
      map.setBounds(bounds);
    }

    new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(start.lat, start.lng), image: new kakao.maps.MarkerImage(dotSvgUrl('#3B82F6'), new kakao.maps.Size(20, 20), { offset: new kakao.maps.Point(10, 10) }) });
    new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(end.lat, end.lng), image: new kakao.maps.MarkerImage(dotSvgUrl('#c9f236'), new kakao.maps.Size(20, 20), { offset: new kakao.maps.Point(10, 10) }) });
  }, [ready, start, end, routeCoords]);

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
      <div ref={mapRef} style={{ height: '260px', borderRadius: 12 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, padding: '0 4px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3B82F6' }} />내 위치
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#c9f236' }} />{end.name}
        </span>
      </div>
    </div>
  );
}
