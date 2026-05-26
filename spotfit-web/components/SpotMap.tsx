'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const myLocationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;
    background:#4F46E5;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function LocateButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.setView([lat, lng], 16);
        onLocate(lat, lng);
        setLoading(false);
      },
      () => {
        alert('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        setLoading(false);
      }
    );
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'absolute',
        bottom: 80,
        right: 12,
        zIndex: 1000,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'white',
        border: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        cursor: 'pointer',
        fontSize: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="현재 위치"
    >
      {loading ? '⏳' : '📍'}
    </button>
  );
}

interface Spot {
  id: string; title: string; sport_name: string; location_name: string;
  latitude: number; longitude: number; current_participants: number;
  max_participants: number; status: string;
}

export default function SpotMap({ spots, userLocation }: {
  spots: Spot[];
  userLocation: { lat: number; lng: number };
}) {
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <MapContainer
      center={[userLocation.lat, userLocation.lng]}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* 현재 위치 마커 */}
      {myLocation && (
        <>
          <Marker position={[myLocation.lat, myLocation.lng]} icon={myLocationIcon}>
            <Popup>📍 현재 위치</Popup>
          </Marker>
          <Circle
            center={[myLocation.lat, myLocation.lng]}
            radius={80}
            pathOptions={{ color: '#4F46E5', fillColor: '#4F46E5', fillOpacity: 0.1, weight: 1 }}
          />
        </>
      )}

      {/* 스팟 마커들 */}
      {spots.map(spot =>
        spot.latitude && spot.longitude ? (
          <Marker key={spot.id} position={[spot.latitude, spot.longitude]}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{spot.title}</strong>
                <p style={{ margin: '4px 0', fontSize: 12, color: '#666' }}>
                  {spot.sport_name} · {spot.location_name}
                </p>
                <p style={{ margin: '4px 0', fontSize: 12 }}>
                  👥 {spot.current_participants}/{spot.max_participants}명
                </p>
                <a
                  href={`/spots/${spot.id}`}
                  style={{ color: '#4F46E5', fontSize: 13, fontWeight: 'bold' }}
                >
                  상세보기 →
                </a>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}

      <LocateButton onLocate={(lat, lng) => setMyLocation({ lat, lng })} />
    </MapContainer>
  );
}
