'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RankEntry {
  id: string; nickname: string; manner_score: number;
  activityScore: number; spotCount: number; subscription_status?: string;
}

const NAV = [
  { href: '/', icon: 'home', label: 'Home', key: 'home' },
  { href: '/?view=map', icon: 'map', label: 'Explore', key: 'explore' },
  { href: '/spots/new', icon: 'add_box', label: 'Host', key: 'host' },
  { href: '/ranking', icon: 'leaderboard', label: 'Ranks', key: 'ranking', active: true },
  { href: '/benefits', icon: 'local_offer', label: '혜택', key: 'benefits' },
];

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

const SPORT_ICONS: Record<string, string> = {
  '농구': 'sports_basketball', '축구': 'sports_soccer', '풋살': 'sports_soccer',
  '헬스': 'fitness_center', '테니스': 'sports_tennis', '수영': 'pool',
  '러닝': 'directions_run', '배드민턴': 'sports_badminton', '야구': 'sports_baseball', '배구': 'sports_volleyball',
};

// 활동점수 기반 티어
const getTier = (score: number) => {
  if (score >= 150) return { icon: '👑', label: 'MASTER',   color: '#c9f236', glow: 'rgba(201,242,54,0.4)' };
  if (score >= 100) return { icon: '💎', label: 'PLATINUM', color: '#06B6D4', glow: 'rgba(6,182,212,0.4)' };
  if (score >= 60)  return { icon: '🥇', label: 'GOLD',     color: '#EAB308', glow: 'rgba(234,179,8,0.4)' };
  if (score >= 30)  return { icon: '🥈', label: 'SILVER',   color: '#94A3B8', glow: 'rgba(148,163,184,0.3)' };
  if (score >= 10)  return { icon: '🥉', label: 'BRONZE',   color: '#CD7F32', glow: 'rgba(205,127,50,0.3)' };
  return { icon: '🌱', label: 'ROOKIE', color: '#6B7280', glow: 'rgba(107,114,128,0.2)' };
};

function getSeasonDays() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [sportId, setSportId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [region, setRegion] = useState('');
  const [myRank, setMyRank] = useState<{ rank: number; score: number; nickname: string } | null>(null);
  const [seasonDays] = useState(getSeasonDays());

  useEffect(() => { fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || [])); }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    const storedUser = stored ? JSON.parse(stored) : null;
    if (token) {
      fetch(`/api/rankings/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.data) setMyRank({ rank: 0, score: d.data.activityScore ?? 0, nickname: storedUser?.nickname || '' });
        }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: period, ...(sportId && { sportId }), ...(region && { region }) });
    fetch(`/api/rankings?${params}`)
      .then(r => r.json())
      .then(d => {
        const list = d.data || [];
        setRankings(list);
        const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (stored) {
          const me = JSON.parse(stored);
          const idx = list.findIndex((r: RankEntry) => r.nickname === me.nickname);
          if (idx >= 0) setMyRank(prev => prev ? { ...prev, rank: idx + 1, score: list[idx].activityScore || Math.round(list[idx].manner_score * 100) } : null);
        }
      }).finally(() => setLoading(false));
  }, [period, sportId, region]);

  // 포디엄 순서: 2위, 1위, 3위
  const top3 = [rankings[1], rankings[0], rankings[2]];
  const myTier = getTier(myRank?.score || 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', paddingBottom: 140 }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #2A2A32',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: '#c9f236', fontSize: 26, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', letterSpacing: '0.05em' }}>RANKING</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(201,242,54,0.08)', border: '1px solid rgba(201,242,54,0.2)', borderRadius: 999, padding: '5px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9f236', boxShadow: '0 0 6px #c9f236', display: 'inline-block' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Season 3</span>
        </div>
      </header>

      {/* Season Banner */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#0d1a00,#1a2e00,#0a1500)', borderBottom: '1px solid rgba(201,242,54,0.15)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 160, height: 160, background: 'radial-gradient(circle,rgba(201,242,54,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,242,54,0.1)', border: '1px solid rgba(201,242,54,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏆</div>
          <div>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: '#c9f236', lineHeight: 1, letterSpacing: '0.06em' }}>SEASON 3 · 2026</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A', marginTop: 2 }}>종료까지 <strong style={{ color: '#c9f236' }}>{seasonDays}일</strong> 남음</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#8A8A9A', letterSpacing: '0.08em' }}>시즌 보상</p>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, color: '#c9f236', marginTop: 2 }}>👑 EXCLUSIVE TITLE</p>
        </div>
      </div>

      {/* Podium — Top 3 */}
      {!loading && rankings.length >= 3 && (
        <section style={{ position: 'relative', overflow: 'hidden', padding: '28px 16px 0', background: 'linear-gradient(180deg,#0d1a00 0%,#0A0A0B 70%)' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 300, height: 200, background: 'radial-gradient(ellipse,rgba(201,242,54,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8A8A9A', textAlign: 'center', marginBottom: 24 }}>🏆 TOP 3 PLAYERS</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8 }}>
            {top3.map((r, idx) => {
              if (!r) return <div key={idx} style={{ flex: 1 }} />;
              const isFirst = idx === 1;
              const rank = isFirst ? 1 : idx === 0 ? 2 : 3;
              const tier = getTier(r.activityScore || 0);
              const podiumColors: Record<number, string> = { 1: '#c9f236', 2: '#94A3B8', 3: '#CD7F32' };
              const color = podiumColors[rank];
              const barH: Record<number, number> = { 1: 100, 2: 70, 3: 52 };
              const avSize: Record<number, number> = { 1: 68, 2: 54, 3: 48 };

              return (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, maxWidth: 110 }}>
                  {isFirst && <div style={{ fontSize: 28, filter: 'drop-shadow(0 0 10px rgba(201,242,54,0.8))' }}>👑</div>}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: avSize[rank], height: avSize[rank], borderRadius: '50%',
                      background: `linear-gradient(135deg,#1a1a1e,#141416)`,
                      border: `${isFirst ? 3 : 2}px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Bebas Neue, sans-serif', fontSize: Math.round(avSize[rank] / 2.8),
                      color, boxShadow: `0 0 ${isFirst ? 24 : 12}px ${color}40`,
                    }}>
                      {r.nickname?.[0]}
                    </div>
                    <div style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: color, border: '2px solid #0A0A0B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color: rank === 1 ? '#171e00' : '#fff' }}>{rank}</div>
                  </div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: isFirst ? '#c9f236' : '#e5e2e3', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                    {r.nickname}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 11 }}>{tier.icon}</span>
                    <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: isFirst ? 22 : 18, color, lineHeight: 1 }}>{r.activityScore || Math.round(r.manner_score * 100)}</p>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, color: '#8A8A9A', textTransform: 'uppercase' }}>pts</span>
                  </div>
                  <div style={{
                    width: '100%', height: barH[rank],
                    background: `linear-gradient(180deg,${color}20,${color}08)`,
                    border: `1px solid ${color}30`, borderBottom: 'none',
                    borderRadius: '10px 10px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, color: `${color}30` }}>{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* 포디엄 바닥 라인 */}
          <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,rgba(201,242,54,0.15) 30%,rgba(201,242,54,0.4) 50%,rgba(201,242,54,0.15) 70%,transparent)', margin: '0 -16px' }} />
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
              flex: 1, padding: '13px 0',
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: activeTab === tab.key ? '#c9f236' : '#8A8A9A',
              borderBottom: `2px solid ${activeTab === tab.key ? '#c9f236' : 'transparent'}`,
              background: 'none', cursor: 'pointer', transition: 'all 0.2s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sport Filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px 6px' }} className="no-scrollbar">
        {[{ id: '', name: 'ALL', icon: 'bolt' }, ...sports.map(s => ({ id: s.id, name: s.name, icon: SPORT_ICONS[s.name] || 'sports' }))].map(s => {
          const active = sportId === s.id;
          return (
            <button key={s.id} onClick={() => setSportId(s.id)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: active ? '#c9f236' : '#1E1E22',
              color: active ? '#171e00' : '#8A8A9A',
              border: `1px solid ${active ? '#c9f236' : '#2A2A32'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{s.icon}</span>
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Region Filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 10px', borderBottom: '1px solid #1E1E22' }} className="no-scrollbar">
        {[{ label: '🌍 전체', value: '' }, ...REGIONS.map(r => ({ label: r, value: r }))].map(({ label, value }) => {
          const active = region === value;
          return (
            <button key={value} onClick={() => setRegion(value)} style={{
              flexShrink: 0, padding: '4px 11px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700,
              background: active ? 'rgba(201,242,54,0.15)' : 'transparent',
              color: active ? '#c9f236' : '#4A4A5A',
              border: `1px solid ${active ? '#c9f236' : '#2A2A32'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Rank List */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 10px' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A9A' }}>
            {region ? `📍 ${region} 지역 랭킹` : '전체 랭킹'}
          </span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#3E3E4A' }}>4위~{rankings.length}위</span>
        </div>

        {loading && [1,2,3,4].map(i => (
          <div key={i} style={{ height: 72, background: '#141416', borderRadius: 16, border: '1px solid #2A2A32', marginBottom: 8 }} />
        ))}

        {!loading && rankings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#8A8A9A' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🏆</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#e5e2e3' }}>아직 랭킹 데이터가 없습니다</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rankings.slice(3).map((r, i) => {
            const rank = i + 4;
            const score = r.activityScore || Math.round(r.manner_score * 100);
            const tier = getTier(score);
            const isMe = myRank?.nickname === r.nickname;

            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: isMe ? 'rgba(201,242,54,0.05)' : '#141416',
                border: `1px solid ${isMe ? 'rgba(201,242,54,0.25)' : '#2A2A32'}`,
                borderLeft: `3px solid ${tier.color}`,
                borderRadius: 14, padding: '10px 12px',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${tier.color}15`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
              >
                {/* 순위 */}
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#3E3E4A', width: 26, textAlign: 'center', flexShrink: 0 }}>{rank}</span>

                {/* 아바타 */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#1E1E22', border: `2px solid ${tier.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: tier.color }}>
                    {r.nickname?.[0]}
                  </div>
                  <span style={{ position: 'absolute', bottom: -3, right: -3, fontSize: 13 }}>{tier.icon}</span>
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: isMe ? '#c9f236' : '#e5e2e3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nickname}</p>
                    {isMe && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: '#c9f236', background: 'rgba(201,242,54,0.1)', border: '1px solid rgba(201,242,54,0.3)', borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase', flexShrink: 0 }}>나</span>}
                    {r.subscription_status === 'premium' && <span style={{ fontSize: 12 }}>👑</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: tier.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tier.label}</span>
                    <span style={{ width: 2, height: 2, borderRadius: '50%', background: '#2A2A32', display: 'inline-block' }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#8A8A9A' }}>스팟 {r.spotCount}회</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#3E3E4A' }}>— 0</span>
                  </div>
                </div>

                {/* 점수 */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: tier.color, lineHeight: 1 }}>{score}</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, color: '#3E3E4A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>PTS</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MY RANK Sticky */}
      <div style={{
        position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, zIndex: 35,
        background: 'rgba(10,10,11,0.97)', backdropFilter: 'blur(16px)',
        borderTop: `2px solid ${myTier.color}`,
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: `0 -8px 32px ${myTier.glow}`,
      }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: myTier.color, flexShrink: 0 }}>MY RANK</span>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#141416', border: `2px solid ${myTier.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: myTier.color, flexShrink: 0, boxShadow: `0 0 12px ${myTier.glow}` }}>
          {myRank?.nickname?.[0] || '나'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
            {myRank?.nickname || '내 랭킹'}
          </p>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: myTier.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {myTier.icon} {myTier.label}
          </span>
        </div>
        {myRank ? (
          <>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#8A8A9A', flexShrink: 0 }}>{myRank.rank > 0 ? `${myRank.rank}위` : ''}</span>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: myTier.color }}>{myRank.score}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, color: '#8A8A9A', textTransform: 'uppercase', marginLeft: 3 }}>PTS</span>
            </div>
          </>
        ) : (
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#8A8A9A', flexShrink: 0 }}>아직 랭킹 없음</span>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, height: 68, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px',
        background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid #2A2A32', borderRadius: '16px 16px 0 0',
      }}>
        {NAV.map(tab => (
          <Link key={tab.key} href={tab.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, color: tab.active ? '#c9f236' : '#8A8A9A',
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '4px 8px', minWidth: 56, transition: 'color 0.2s',
            filter: tab.active ? 'drop-shadow(0 0 6px rgba(201,242,54,0.35))' : 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: tab.active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
