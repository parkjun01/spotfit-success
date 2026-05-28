'use client';
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SPORT_COLORS: Record<string, string> = {
  '축구': '#16A34A', '풋살': '#22C55E', '농구': '#EA580C', '야구': '#2563EB',
  '소프트볼': '#3B82F6', '야구/소프트볼': '#2563EB', '배드민턴': '#9333EA',
  '테니스': '#CA8A04', '탁구': '#0891B2', '수영': '#06B6D4', '러닝': '#DC2626',
  '등산': '#78350F', '클라이밍': '#C2410C', '요가': '#DB2777', '필라테스': '#EC4899',
  '헬스': '#475569', '골프': '#15803D', '볼링': '#7C3AED', '배구': '#D97706', '핸드볼': '#0D9488',
};
const COLOR_POOL = ['#F97316','#16A34A','#2563EB','#9333EA','#DC2626','#CA8A04','#0D9488','#DB2777'];

function getSportColor(sportName: string | undefined): string {
  if (!sportName) return COLOR_POOL[0];
  if (SPORT_COLORS[sportName]) return SPORT_COLORS[sportName];
  let hash = 0;
  for (let i = 0; i < sportName.length; i++) hash = sportName.charCodeAt(i) + ((hash << 5) - hash);
  return COLOR_POOL[Math.abs(hash) % COLOR_POOL.length];
}

// 직방 스타일 — 색깔 원형 점 + 인원수 표시
function createSpotIcon(color: string, current: number, max: number, isFull: boolean) {
  const bg = isFull ? '#94A3B8' : color;
  const pulse = isFull ? '' : `
    <div style="
      position:absolute; inset:-4px;
      border-radius:50%;
      border:2px solid ${bg};
      opacity:0.4;
      animation:none;
    "></div>
  `;
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; display:inline-flex; align-items:center; justify-content:center;">
        ${pulse}
        <div style="
          width:36px; height:36px;
          background:${bg};
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          display:flex; align-items:center; justify-content:center;
          flex-direction:column;
          color:white;
          font-weight:800;
          font-size:11px;
          line-height:1.1;
          font-family:'Inter',-apple-system,sans-serif;
        ">
          <span>${current}</span>
          <div style="width:14px;height:1px;background:rgba(255,255,255,0.5);margin:1px 0;"></div>
          <span style="font-size:9px;font-weight:600;opacity:0.85">${max}</span>
        </div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

const myLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:18px;height:18px;">
      <div style="
        position:absolute;inset:-6px;
        background:#F97316;
        border-radius:50%;
        opacity:0.2;
      "></div>
      <div style="
        width:18px;height:18px;
        background:#F97316;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(249,115,22,0.5);
      "></div>
    </div>`,
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
      () => { alert('위치 권한을 확인해주세요.'); setLoading(false); }
    );
  };
  return (
    <button
      onClick={handleClick}
      style={{
        position: 'absolute', bottom: 80, right: 12, zIndex: 1000,
        width: 44, height: 44, borderRadius: '50%',
        background: 'white', border: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'pointer', fontSize: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {loading ? '⏳' : '📍'}
    </button>
  );
}

// 종목 범례 (직방 스타일 — 좌측 하단 색깔 도트)
function Legend({ sports }: { sports: string[] }) {
  if (sports.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
      background: 'white', borderRadius: 12, padding: '8px 12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontSize: 12,
      maxWidth: 140,
    }}>
      {sports.map(name => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: getSportColor(name), flexShrink: 0,
            boxShadow: `0 0 0 2px ${getSportColor(name)}33`,
          }} />
          <span style={{ color: '#374151', fontWeight: 600 }}>{name}</span>
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
    <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={14} style={{ width: '100%', height: '100%' }}>
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
            pathOptions={{ color: '#F97316', fillColor: '#F97316', fillOpacity: 0.08, weight: 1.5 }}
          />
        </>
      )}

      {spots.map(spot =>
        spot.latitude && spot.longitude ? (
          <Marker
            key={spot.id}
            position={[spot.latitude, spot.longitude]}
            icon={createSpotIcon(
              getSportColor(spot.sport_name),
              spot.current_participants,
              spot.max_participants,
              spot.status === 'full'
            )}
          >
            <Popup>
              <div style={{ minWidth: 200, fontFamily: "'Inter',-apple-system,sans-serif" }}>
                {/* 상단 컬러 바 */}
                <div style={{
                  height: 4,
                  background: spot.status === 'full' ? '#94A3B8' : getSportColor(spot.sport_name),
                  borderRadius: '4px 4px 0 0',
                  margin: '-4px -12px 10px',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: getSportColor(spot.sport_name), flexShrink: 0,
                  }} />
                  <strong style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{spot.title}</strong>
                </div>
                <p style={{ margin: '3px 0', fontSize: 12, color: '#666' }}>
                  🏃 {spot.sport_name}
                  {spot.difficulty_level ? ` · ${DIFFICULTY[spot.difficulty_level] || spot.difficulty_level}` : ''}
                </p>
                {spot.starts_at && (
                  <p style={{ margin: '3px 0', fontSize: 12, color: '#666' }}>
                    🕐 {new Date(spot.starts_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}{' '}
                    {new Date(spot.starts_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <p style={{ margin: '3px 0', fontSize: 12, color: '#666' }}>📍 {spot.location_name}</p>

                {/* 참여 프로그레스 */}
                <div style={{ margin: '8px 0 6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 4 }}>
                    <span>참여 {spot.current_participants}/{spot.max_participants}명</span>
                    {spot.status === 'full' && <span style={{ color: '#EF4444', fontWeight: 700 }}>마감</span>}
                  </div>
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99 }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      width: `${Math.min(100, (spot.current_participants / spot.max_participants) * 100)}%`,
                      background: spot.status === 'full' ? '#94A3B8' : getSportColor(spot.sport_name),
                    }} />
                  </div>
                </div>

                <a
                  href={`/spots/${spot.id}`}
                  style={{
                    display: 'block', textAlign: 'center', marginTop: 8, padding: '8px 0',
                    background: spot.status === 'full' ? '#94A3B8' : getSportColor(spot.sport_name),
                    color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 800,
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
