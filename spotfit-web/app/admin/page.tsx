'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ADMIN_PIN = '0104';

type Stats = {
  users: { total: number; new_this_week: number };
  spots: {
    total: number;
    new_this_week: number;
    by_status: {
      recruiting: number;
      full: number;
      in_progress: number;
      completed: number;
      cancelled: number;
    };
  };
  no_show: { total: number };
  manner_distribution: { green: number; yellow: number; red: number };
};

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [schedulerLog, setSchedulerLog] = useState<string[] | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [pendingInfo, setPendingInfo] = useState<{ pending_noshow: number; pending_auto_complete: number } | null>(null);

  const handlePin = () => {
    if (pin === ADMIN_PIN) {
      setAuthed(true);
      setPinError(false);
      loadStats();
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [statsRes, pendingRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }).then(r => r.json()),
        fetch('/api/admin/run-scheduler', { headers }).then(r => r.json()),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (pendingRes.data) setPendingInfo(pendingRes.data);
    } finally {
      setLoading(false);
    }
  };

  const runScheduler = async () => {
    setSchedulerRunning(true);
    setSchedulerLog(null);
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/run-scheduler', {
        method: 'POST',
        headers,
      });
      const json = await res.json();
      if (json.data?.log) setSchedulerLog(json.data.log);
      await loadStats();
    } finally {
      setSchedulerRunning(false);
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#131314', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 360, background: '#1E1E22', borderRadius: 20, padding: 32, border: '1px solid #2A2A32' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: '#c9f236', letterSpacing: '0.05em' }}>ADMIN</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#6A6A7A', marginTop: 4 }}>관리자 PIN을 입력하세요</p>
          </div>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePin()}
            placeholder="● ● ● ●"
            maxLength={8}
            style={{
              width: '100%', padding: '14px 16px', background: '#131314', border: `1px solid ${pinError ? '#EF4444' : '#3A3A42'}`,
              borderRadius: 12, color: '#ffffef', fontFamily: 'DM Sans, sans-serif', fontSize: 18, letterSpacing: 8,
              textAlign: 'center', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {pinError && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444', textAlign: 'center', marginTop: 8 }}>PIN이 올바르지 않습니다</p>
          )}
          <button
            onClick={handlePin}
            style={{
              width: '100%', marginTop: 16, padding: '14px 0', background: '#c9f236', borderRadius: 12,
              border: 'none', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 16, fontWeight: 700, color: '#171e00', letterSpacing: '0.05em',
            }}
          >
            확인
          </button>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6A6A7A', textDecoration: 'none' }}>← 홈으로</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 40 }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32' }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', letterSpacing: '0.05em' }}>ADMIN DASHBOARD</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadStats} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A9A', background: '#1E1E22', border: 'none', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
          </button>
          <Link href="/" style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A9A', background: '#1E1E22' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>home</span>
          </Link>
        </div>
      </header>

      <div style={{ padding: '16px' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!loading && stats && (
          <>
            {/* 핵심 수치 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <StatCard label="전체 유저" value={stats.users.total} sub={`이번 주 +${stats.users.new_this_week}`} color="#c9f236" icon="group" />
              <StatCard label="전체 스팟" value={stats.spots.total} sub={`이번 주 +${stats.spots.new_this_week}`} color="#60A5FA" icon="location_on" />
              <StatCard label="누적 노쇼" value={stats.no_show.total} sub="매너점수 -5점 처리됨" color="#F87171" icon="person_off" />
              <StatCard
                label="활성 스팟"
                value={stats.spots.by_status.recruiting + stats.spots.by_status.full + stats.spots.by_status.in_progress}
                sub={`모집중 ${stats.spots.by_status.recruiting} / 마감 ${stats.spots.by_status.full}`}
                color="#34D399"
                icon="bolt"
              />
            </div>

            {/* 스팟 상태 분포 */}
            <SectionCard title="스팟 상태 분포" icon="donut_large">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: '모집중', key: 'recruiting', color: '#34D399' },
                  { label: '마감', key: 'full', color: '#60A5FA' },
                  { label: '진행중', key: 'in_progress', color: '#FBBF24' },
                  { label: '완료', key: 'completed', color: '#8A8A9A' },
                  { label: '취소', key: 'cancelled', color: '#F87171' },
                ].map(({ label, key, color }) => {
                  const count = stats.spots.by_status[key as keyof typeof stats.spots.by_status];
                  const pct = stats.spots.total > 0 ? Math.round((count / stats.spots.total) * 100) : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#ffffef' }}>{label}</span>
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color }}>{count}개 ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#2A2A32', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            {/* 매너점수 분포 */}
            <SectionCard title="매너점수 분포" icon="grade">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'EXCELLENT', sub: '38점 이상', value: stats.manner_distribution.green, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
                  { label: 'GOOD', sub: '30~38점', value: stats.manner_distribution.yellow, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                  { label: 'WARNING', sub: '30점 미만', value: stats.manner_distribution.red, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
                ].map(({ label, sub, value, color, bg }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color, lineHeight: 1 }}>{value}</p>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', marginTop: 2 }}>{label}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, color: '#6A6A7A', marginTop: 2 }}>{sub}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6A6A7A', marginTop: 10, textAlign: 'center' }}>
                30점 미만 유저는 스팟 생성·참가가 제한됩니다
              </p>
            </SectionCard>

            {/* 스케줄러 */}
            <SectionCard title="노쇼 감지 / 자동 완료 스케줄러" icon="schedule_send">
              {pendingInfo && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#131314', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: '#F87171' }}>{pendingInfo.pending_noshow}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6A6A7A' }}>노쇼 처리 대기</p>
                  </div>
                  <div style={{ background: '#131314', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: '#FBBF24' }}>{pendingInfo.pending_auto_complete}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6A6A7A' }}>자동 완료 대기</p>
                  </div>
                </div>
              )}
              <button
                onClick={runScheduler}
                disabled={schedulerRunning}
                style={{
                  width: '100%', padding: '14px 0',
                  background: schedulerRunning ? '#2A2A32' : '#c9f236',
                  borderRadius: 12, border: 'none', cursor: schedulerRunning ? 'not-allowed' : 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700,
                  color: schedulerRunning ? '#6A6A7A' : '#171e00', letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {schedulerRunning ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid #6A6A7A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    처리 중...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_arrow</span>
                    지금 실행
                  </>
                )}
              </button>
              {schedulerLog && (
                <div style={{ marginTop: 12, background: '#131314', borderRadius: 10, padding: 12, border: '1px solid #2A2A32' }}>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#c9f236', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>실행 결과</p>
                  {schedulerLog.map((line, i) => (
                    <p key={i} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#ffffef', lineHeight: 1.6 }}>→ {line}</p>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 개발 도구 */}
            <SectionCard title="개발 도구" icon="construction">
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/seed" style={{ flex: 1, padding: '12px 0', background: '#1E1E22', border: '1px solid #3A3A42', borderRadius: 12, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#8A8A9A', textDecoration: 'none', letterSpacing: '0.05em' }}>
                  시드 데이터
                </Link>
                <Link href="/ranking" style={{ flex: 1, padding: '12px 0', background: '#1E1E22', border: '1px solid #3A3A42', borderRadius: 12, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#8A8A9A', textDecoration: 'none', letterSpacing: '0.05em' }}>
                  랭킹 페이지
                </Link>
              </div>
            </SectionCard>
          </>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: number; sub: string; color: string; icon: string }) {
  return (
    <div style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{icon}</span>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6A6A7A' }}>{label}</p>
      </div>
      <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color, lineHeight: 1, marginBottom: 4 }}>{value.toLocaleString()}</p>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#6A6A7A' }}>{sub}</p>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#c9f236' }}>{icon}</span>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#ffffef', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      </div>
      {children}
    </div>
  );
}
