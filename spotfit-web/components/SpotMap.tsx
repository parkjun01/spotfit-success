'use client';
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 종목별 색상 매핑
const SPORT_COLORS: Record<string, string> = {
  '축구':       '#16A34A',
  '풋살':       '#22C55E',
  '농구':       '#EA580C',
  '야구':       '#2563EB',
  '소프트볼':   '#3B82F6',
  '야구/소프트볼': '#2563EB',
  '배드민턴':   '#9333EA',
  '테니스':     '#CA8A04',
  '탁구':       '#0891B2',
  '수영':       '#06B6D4',
  '러닝':       '#DC2626',
  '등산':       '#78350F',
  '클라이밍':   '#C2410C',
  '요가':       '#DB2777',
  '필라테스':   '#EC4899',
  '헬스':       '#475569',
  '골프':       '#15803D',
  '볼링':       '#7C3AED',
  '배구':       '#D97706',
  '핸드볼':     '#0D9488',
};

const COLOR_POOL = [
  '#4F46E5','#0891B2','#16A34A','#EA580C','#9333EA',
  '#DC2626','#CA8A04','#0D9488','#DB2777','#78350F',
];

function getSportColor(sportName: string): string {
  if (SPORT_COLORS[sportName]) return SPORT_COLORS[sportName];
  // 이름 해시로 색상 결정
  let hash = 0;
  for (let i = 0; i < sportName.length; i++) hash = sportName.charCodeAt(i) + ((hash << 5) - hash);
  return COLOR_POOL[Math.abs(hash) % COLOR_POOL.length];
}

function createSpotIcon(color: string, sportName: string, isFull: boolean) {
  const bg = isFull ? '#94A3B8' : color;
  const label = sportName.length > 3 ? sportName.slice(0, 3) : sportName;
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};
      color:white;
      font-size:11px;
      font-weight:700;
      padding:3px 7px;
      border-radius:20px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      white-space:nowrap;
      line-height:1.4;
    ">${label}</div>`,
    iconSize: [undefined as any, undefined as any],
    iconAnchor: [20, 12],
    popupAnchor: [0, -14],
  });
}

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
        bottom: 80, right: 12,
        zIndex: 1000,
        width: 44, height: 44,
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
    >
      {loading ? '⏳' : '📍'}
    </button>
  );
}

// 종목 범례
function Legend({ sports }: { sports: string[] }) {
  if (sports.length === 0) return null;
  return (
    <div style={{
      position: 'absolute',
      bottom: 12, left: 12,
      zIndex: 1000,
      background: 'white',
      borderRadius: 10,
      padding: '8px 10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontSize: 11,
      maxWidth: 130,
    }}>
      {sports.map(name => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{
            width: 10, height: 10,
            borderRadius: '50%',
            background: getSportColor(name),
            flexShrink: 0,
          }} />
          <span style={{ color: '#374151' }}>{name}</span>
        </div>
      ))}
    </div>
  );
}

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };

interface Spot {
  id: string; title: string; sport_name: string; location_name: string;
  latitude: number; longitude: number; current_participants: number;
  max_participants: number; status: string;
  starts_at?: string; host_nickname?: string; host_manner_score?: number;
  difficulty_level?: string;
}

export default function SpotMap({ spots, userLocation }: {
  spots: Spot[];
  userLocation: { lat: number; lng: number };
}) {
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);

  const uniqueSports = [...new Set(spots.map(s => s.sport_name))];

  return (
    <MapContainer
      center={[userLocation.lat, userLocation.lng]}
      zoom={14}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

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

      {spots.map(spot =>
        spot.latitude && spot.longitude ? (
          <Marker
            key={spot.id}
            position={[spot.latitude, spot.longitude]}
            icon={createSpotIcon(getSportColor(spot.sport_name), spot.sport_name, spot.status === 'full')}
          >
            <Popup>
              <div style={{ minWidth: 190 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: getSportColor(spot.sport_name), flexShrink: 0,
                  }} />
                  <strong style={{ fontSize: 14 }}>{spot.title}</strong>
                </div>
                <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>
                  🏃 {spot.sport_name}{spot.difficulty_level ? ` · ${DIFFICULTY[spot.difficulty_level] || spot.difficulty_level}` : ''}
                </p>
                {spot.starts_at && (
                  <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>
                    🕐 {new Date(spot.starts_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} {new Date(spot.starts_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>📍 {spot.location_name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0' }}>
                  <span style={{ fontSize: 12 }}>
                    👥 {spot.current_participants}/{spot.max_participants}명
                    {spot.status === 'full' && <span style={{ color: '#EF4444', marginLeft: 4 }}>마감</span>}
                  </span>
                  {spot.host_manner_score !== undefined && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: spot.host_manner_score >= 38 ? '#059669' : spot.host_manner_score >= 30 ? '#D97706' : '#EF4444',
                    }}>
                      ★{spot.host_manner_score.toFixed(1)}
                    </span>
                  )}
                </div>
                <a
                  href={`/spots/${spot.id}`}
                  style={{
                    display: 'block', textAlign: 'center', marginTop: 6, padding: '7px 0',
                    background: spot.status === 'full' ? '#94A3B8' : '#4F46E5',
                    color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 'bold',
                    textDecoration: 'none',
                  }}
                >
                  {spot.status === 'full' ? '마감된 스팟' : '참여하기 →'}
                </a>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}

      <LocateButton onLocate={(lat, lng) => setMyLocation({ lat, lng })} />
      <Legend sports={uniqueSports} />
    </MapContainer>
  );
}
