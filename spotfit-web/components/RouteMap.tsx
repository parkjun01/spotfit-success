'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number; name: string };
  routeCoords: [number, number][];
  distance: number;
  duration: number;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) map.fitBounds(coords, { padding: [50, 50] });
  }, [coords, map]);
  return null;
}

const dotIcon = (color: string) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function RouteMap({ start, end, routeCoords, distance, duration }: Props) {
  const distKm = distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`;
  const minutes = Math.round(duration / 60);

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

      <MapContainer
        center={[start.lat, start.lng]}
        zoom={14}
        style={{ height: '260px', borderRadius: '12px' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routeCoords.length > 0 && (
          <>
            <Polyline positions={routeCoords} color="#F97316" weight={5} opacity={0.85} />
            <FitBounds coords={routeCoords} />
          </>
        )}
        <Marker position={[start.lat, start.lng]} icon={dotIcon('#3B82F6')}>
          <Popup>내 위치</Popup>
        </Marker>
        <Marker position={[end.lat, end.lng]} icon={dotIcon('#F97316')}>
          <Popup>{end.name}</Popup>
        </Marker>
      </MapContainer>

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
