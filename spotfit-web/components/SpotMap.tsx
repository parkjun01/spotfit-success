'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng]); }, [lat, lng, map]);
  return null;
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
      <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />
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
    </MapContainer>
  );
}
