'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  recruiting: { label: '모집중', color: 'bg-emerald-100 text-emerald-700' },
  full: { label: '마감', color: 'bg-red-100 text-red-600' },
  in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '종료', color: 'bg-gray-100 text-gray-500' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-gray-400' },
};

const DIFFICULTY: Record<string, string> = { beginner: '초급', intermediate: '중급', advanced: '고급' };

export default function MySpotHistoryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'participated' | 'hosted'>('participated');
  const [spots, setSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    fetch(`/api/users/me/spots?type=${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(d => setSpots(d.data || [])).finally(() => setLoading(false));
  }, [tab]);

  const STATUS_DARK: Record<string, { label: string; bg: string; color: string }> = {
    recruiting: { label: '모집중', bg: 'rgba(201,242,54,0.1)', color: '#c9f236' },
    full: { label: '마감', bg: 'rgba(239,68,68,0.1)', color: '#EF4444' },
    in_progress: { label: '진행중', bg: 'rgba(59,130,246,0.1)', color: '#60A5FA' },
    completed: { label: '종료', bg: '#1E1E22', color: '#8A8A9A' },
    cancelled: { label: '취소', bg: '#1E1E22', color: '#3E3E4A' },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 32 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#c9f236', letterSpacing: '0.05em' }}>내 스팟 이력</h1>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid #2A2A32', background: '#141416', position: 'sticky', top: 64, zIndex: 30 }}>
        {([['participated', '참여한 스팟'], ['hosted', '생성한 스팟']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={{ flex: 1, padding: '12px 0', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'none', border: 'none', borderBottom: `2px solid ${tab === val ? '#c9f236' : 'transparent'}`, color: tab === val ? '#c9f236' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}><div style={{ width: 32, height: 32, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
        {!loading && spots.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 64 }}>
            <p style={{ fontSize: 40 }}>🏃</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#8A8A9A', marginTop: 12 }}>{tab === 'participated' ? '참여한 스팟이 없습니다' : '생성한 스팟이 없습니다'}</p>
            <Link href="/" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#c9f236', textTransform: 'uppercase', display: 'inline-block', marginTop: 12 }}>스팟 찾아보기 →</Link>
          </div>
        )}
        {spots.map(spot => {
          const s = STATUS_DARK[spot.status] || { label: spot.status, bg: '#1E1E22', color: '#8A8A9A' };
          return (
            <Link key={spot.id} href={`/spots/${spot.id}`}>
              <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,242,54,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A32')}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' as const }}>
                  {spot.sports?.name && <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: 'rgba(201,242,54,0.1)', color: '#c9f236', border: '1px solid rgba(201,242,54,0.2)' }}>{spot.sports.name}</span>}
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: s.bg, color: s.color }}>{s.label}</span>
                  {spot.difficulty_level && <span style={{ padding: '3px 10px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, background: '#1E1E22', color: '#8A8A9A', border: '1px solid #2A2A32' }}>{DIFFICULTY[spot.difficulty_level]}</span>}
                </div>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700, color: '#ffffef', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot.title}</p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A', marginBottom: 4 }}>📍 {spot.location_name}</p>
                {spot.starts_at && <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A' }}>🕐 {format(new Date(spot.starts_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#8A8A9A' }}>👥 {spot.current_participants}/{spot.max_participants}명</span>
                  {spot.status === 'completed' && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#c9f236', textTransform: 'uppercase' }}>평가 가능</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
