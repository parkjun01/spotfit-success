'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RankEntry {
  id: string; nickname: string; manner_score: number;
  activityScore: number; spotCount: number; subscription_status?: string;
}

const NAV: { href: string; icon: string; label: string; key: string; active?: boolean }[] = [
  { href: '/', icon: 'home', label: 'Home', key: 'home' },
  { href: '/?view=map', icon: 'map', label: 'Explore', key: 'explore' },
  { href: '/spots/new', icon: 'add_box', label: 'Host', key: 'host' },
  { href: '/ranking', icon: 'leaderboard', label: 'Ranks', key: 'ranking', active: true },
  { href: '/benefits', icon: 'local_offer', label: '혜택', key: 'benefits' },
];

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [sportId, setSportId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [myRank, setMyRank] = useState<{ rank: number; score: number; nickname: string } | null>(null);

  useEffect(() => { fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || [])); }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
      fetch(`/api/rankings/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.data) setMyRank(d.data); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: period, ...(sportId && { sportId }) });
    fetch(`/api/rankings?${params}`)
      .then(r => r.json())
      .then(d => setRankings(d.data || []))
      .finally(() => setLoading(false));
  }, [period, sportId]);

  const top3 = [rankings[1], rankings[0], rankings[2]];

  return (
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 140 }}>

      {/* Top Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2A2A32',
      }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', letterSpacing: '0.05em' }}>RANKING</span>
        <button style={{ width: 36, height: 36, borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e2e3' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>emoji_events</span>
        </button>
      </header>

      {/* Season Banner */}
      <div style={{ background: 'linear-gradient(90deg,#1a2200,#0d1a00)', borderBottom: '1px solid #2A2A32', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: '#c9f236', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>trophy</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Season 3 · 2026</span>
        </div>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#8A8A9A' }}>12일 남음</span>
      </div>

      {/* Podium */}
      {!loading && rankings.length >= 3 && (
        <section style={{ background: 'linear-gradient(175deg,#1a2200 0%,#131314 60%)', padding: '24px 16px', borderBottom: '1px solid #2A2A32' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae', textAlign: 'center', marginBottom: 24 }}>🏆 TOP 3 PLAYERS</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, height: 200 }}>
            {top3.map((r, idx) => {
              if (!r) return null;
              const isFirst = idx === 1;
              const avSize = isFirst ? 64 : idx === 0 ? 52 : 48;
              const barHeight = isFirst ? 100 : idx === 0 ? 72 : 50;
              const borderColor = isFirst ? '#c9f236' : idx === 0 ? '#C0C0C0' : '#CD7F32';
              const score = isFirst ? rankings[0] : idx === 0 ? rankings[1] : rankings[2];
              const rank = isFirst ? 1 : idx === 0 ? 2 : 3;
              return (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ position: 'relative' }}>
                    {isFirst && <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 20 }}>👑</div>}
                    <div style={{
                      width: avSize, height: avSize, borderRadius: '50%',
                      background: '#1E1E22', border: `${isFirst ? 3 : 2}px solid ${borderColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3',
                    }}>
                      {r.nickname?.[0]}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: -4, right: -4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: borderColor, border: '2px solid #131314',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700,
                      color: isFirst ? '#171e00' : '#fff',
                    }}>{rank}</div>
                  </div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: isFirst ? '#c9f236' : '#e5e2e3', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.nickname}
                  </p>
                  <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: isFirst ? 22 : 18, color: '#c9f236', lineHeight: 1 }}>
                    {r.activityScore || Math.round(r.manner_score * 100)}
                  </p>
                  <div style={{
                    width: 80, height: barHeight,
                    background: isFirst ? '#c9f236' : '#2a2a2b',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    paddingTop: 8,
                    fontFamily: 'Bebas Neue, sans-serif', fontSize: 24,
                    color: isFirst ? '#171e00' : '#8A8A9A',
                  }}>{rank}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2A2A32', background: '#141416', position: 'sticky', top: 64, zIndex: 30 }}>
        {[
          { key: 'all', label: '전체' },
          { key: 'weekly', label: '이번 주' },
          { key: 'monthly', label: '이번 달' },
          { key: 'nearby', label: '내 주변' },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === 'weekly') setPeriod('weekly'); if (tab.key === 'monthly') setPeriod('monthly'); }}
            style={{
              flex: 1, padding: '12px 0',
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: activeTab === tab.key ? '#c9f236' : '#8A8A9A',
              borderBottom: `2px solid ${activeTab === tab.key ? '#c9f236' : 'transparent'}`,
              background: 'none', cursor: 'pointer', transition: 'color 0.2s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sport Filter — uses real DB sport IDs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px' }} className="no-scrollbar">
        {[
          { id: '', name: 'ALL', icon: 'bolt' },
          ...sports.map(s => ({
            id: s.id,
            name: s.name,
            icon: ({ '농구':'sports_basketball','축구':'sports_soccer','풋살':'sports_soccer','헬스':'fitness_center','테니스':'sports_tennis','수영':'pool','러닝':'directions_run','배드민턴':'sports_badminton','야구':'sports_baseball','배구':'sports_volleyball' } as Record<string,string>)[s.name] || 'sports',
          })),
        ].map(s => {
          const active = sportId === s.id;
          return (
            <button key={s.id} onClick={() => setSportId(s.id)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 14px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              background: active ? '#c9f236' : '#1E1E22',
              color: active ? '#171e00' : '#8A8A9A',
              border: `1px solid ${active ? '#c9f236' : '#2A2A32'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{s.icon}</span>
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Rank List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 8px' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae' }}>전체 랭킹</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A' }}>4~{rankings.length}위 표시중</span>
        </div>

        {loading && [1,2,3,4].map(i => (
          <div key={i} style={{ height: 68, background: '#1E1E22', borderRadius: 16, border: '1px solid #2A2A32' }} />
        ))}

        {!loading && rankings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8A8A9A' }}>아직 랭킹 데이터가 없습니다</div>
        )}

        {rankings.slice(3).map((r, i) => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, padding: 12,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#c9f236'; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2A32'; (e.currentTarget as HTMLDivElement).style.transform = ''; }}
          >
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#8A8A9A', width: 28, textAlign: 'center' }}>{i + 4}</span>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2a2a2b', border: '2px solid #2A2A32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', flexShrink: 0 }}>
              {r.nickname?.[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#e5e2e3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nickname}</p>
                {r.subscription_status === 'premium' && <span style={{ fontSize: 12 }}>👑</span>}
              </div>
              <p style={{ fontSize: 12, color: '#8A8A9A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>스팟 {r.spotCount}회</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#2A2A32', display: 'inline-block' }} />
                <span>{r.activityScore}점</span>
                {/* 순위 변동 — ranking.html: ▲▼— indicators */}
                <span style={{ fontSize: 11, color: '#8A8A9A' }}>— 0</span>
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: '#c9f236', lineHeight: 1 }}>{r.activityScore || Math.round(r.manner_score * 100)}</div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>PTS</div>
            </div>
          </div>
        ))}
      </div>

      {/* My Rank Sticky */}
      <div style={{
        position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, zIndex: 35,
        background: 'rgba(20,20,22,0.95)', borderTop: '1px solid #c9f236', backdropFilter: 'blur(12px)',
        padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c9f236' }}>MY RANK</span>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1E1E22', border: '2px solid #c9f236', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#e5e2e3' }}>
          {myRank?.nickname?.[0] || '나'}
        </div>
        <span style={{ flex: 1, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3' }}>
          {myRank?.nickname || '내 랭킹'}
        </span>
        {myRank ? (
          <>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#8A8A9A' }}>{myRank.rank}위</span>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: '#c9f236' }}>{myRank.score}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, color: '#8A8A9A', textTransform: 'uppercase' }}>PTS</span>
          </>
        ) : (
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#8A8A9A' }}>아직 랭킹 없음</span>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, height: 68, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px',
        background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid #2A2A32', borderRadius: '16px 16px 0 0',
      }}>
        {NAV.map(tab => (
          <Link key={tab.key || tab.href} href={tab.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, color: (tab as any).active ? '#c9f236' : '#8A8A9A',
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '4px 8px', minWidth: 56, transition: 'color 0.2s',
            filter: (tab as any).active ? 'drop-shadow(0 0 6px rgba(201,242,54,0.35))' : 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: (tab as any).active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
