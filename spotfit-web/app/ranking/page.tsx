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

const REGIONS = ['서울','경기','인천','부산','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'];

const SPORT_ICONS: Record<string, string> = {
  '농구': 'sports_basketball', '축구': 'sports_soccer', '풋살': 'sports_soccer',
  '헬스': 'fitness_center', '테니스': 'sports_tennis', '수영': 'pool',
  '러닝': 'directions_run', '배드민턴': 'sports_badminton', '야구': 'sports_baseball', '배구': 'sports_volleyball',
};

const TIERS = [
  { min: 150, icon: '👑', label: 'MASTER',   color: '#c9f236', bg: 'rgba(201,242,54,0.12)',  glow: 'rgba(201,242,54,0.5)' },
  { min: 100, icon: '💎', label: 'PLATINUM', color: '#06B6D4', bg: 'rgba(6,182,212,0.12)',   glow: 'rgba(6,182,212,0.5)' },
  { min: 60,  icon: '🥇', label: 'GOLD',     color: '#EAB308', bg: 'rgba(234,179,8,0.12)',   glow: 'rgba(234,179,8,0.5)' },
  { min: 30,  icon: '🥈', label: 'SILVER',   color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', glow: 'rgba(148,163,184,0.4)' },
  { min: 10,  icon: '🥉', label: 'BRONZE',   color: '#CD7F32', bg: 'rgba(205,127,50,0.12)',  glow: 'rgba(205,127,50,0.4)' },
  { min: 0,   icon: '🌱', label: 'ROOKIE',   color: '#6B7280', bg: 'rgba(107,114,128,0.08)', glow: 'rgba(107,114,128,0.2)' },
];
const getTier = (score: number) => TIERS.find(t => score >= t.min) || TIERS[TIERS.length - 1];

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
      fetch('/api/rankings/me', { headers: { Authorization: `Bearer ${token}` } })
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

  const top3 = [rankings[1], rankings[0], rankings[2]];
  const myTier = getTier(myRank?.score || 0);
  const maxScore = rankings[0] ? (rankings[0].activityScore || Math.round(rankings[0].manner_score * 100)) : 1;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', paddingBottom: 140 }}>

      {/* ── 헤더 ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,242,54,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(201,242,54,0.1)', border: '1px solid rgba(201,242,54,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#c9f236', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          </div>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: '#fff', letterSpacing: '0.08em' }}>RANKING</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(201,242,54,0.08)', border: '1px solid rgba(201,242,54,0.2)', borderRadius: 999, padding: '5px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9f236', boxShadow: '0 0 8px #c9f236', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LIVE · S3</span>
        </div>
      </header>

      {/* ── 시즌 배너 ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0c1800 0%,#162400 50%,#0a1200 100%)',
        borderBottom: '1px solid rgba(201,242,54,0.12)',
        padding: '16px',
      }}>
        {/* 배경 장식 */}
        <div style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, background: 'radial-gradient(circle,rgba(201,242,54,0.08) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, background: 'radial-gradient(circle,rgba(201,242,54,0.04) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(201,242,54,0.08)', border: '1px solid rgba(201,242,54,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 20px rgba(201,242,54,0.1)' }}>🏆</div>
            <div>
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: '#c9f236', lineHeight: 1, letterSpacing: '0.08em' }}>SEASON 3 · 2026</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                시즌 종료까지&nbsp;<strong style={{ color: '#c9f236', fontWeight: 700 }}>{seasonDays}일</strong>&nbsp;남음
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#4A4A5A', letterSpacing: '0.1em', marginBottom: 4 }}>시즌 보상</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(201,242,54,0.06)', border: '1px solid rgba(201,242,54,0.15)', borderRadius: 8, padding: '4px 8px' }}>
              <span style={{ fontSize: 14 }}>👑</span>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 14, color: '#c9f236', letterSpacing: '0.05em' }}>EXCLUSIVE TITLE</span>
            </div>
          </div>
        </div>

        {/* 티어 범례 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {TIERS.map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.bg, border: `1px solid ${t.color}25`, borderRadius: 999, padding: '3px 9px' }}>
              <span style={{ fontSize: 10 }}>{t.icon}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 포디엄 TOP 3 ── */}
      {!loading && rankings.length >= 3 && (
        <section style={{ position: 'relative', overflow: 'hidden', padding: '32px 16px 0', background: 'linear-gradient(180deg,#0d1a00 0%,#0A0A0B 80%)' }}>
          {/* 중앙 후광 */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 280, height: 240, background: 'radial-gradient(ellipse,rgba(201,242,54,0.09) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#4A4A5A', textAlign: 'center', marginBottom: 28 }}>✦ TOP 3 PLAYERS ✦</p>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
            {top3.map((r, idx) => {
              if (!r) return <div key={idx} style={{ flex: 1 }} />;
              const isFirst = idx === 1;
              const rank = isFirst ? 1 : idx === 0 ? 2 : 3;
              const tier = getTier(r.activityScore || 0);
              const podiumColor: Record<number,string> = { 1: '#c9f236', 2: '#94A3B8', 3: '#CD7F32' };
              const medalEmoji: Record<number,string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
              const color = podiumColor[rank];
              const barH: Record<number,number> = { 1: 110, 2: 76, 3: 58 };
              const avSize: Record<number,number> = { 1: 76, 2: 58, 3: 52 };

              return (
                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1, maxWidth: 118 }}>
                  {/* 1위 왕관 */}
                  {isFirst && (
                    <div style={{ fontSize: 32, filter: `drop-shadow(0 0 14px ${color}cc)`, marginBottom: 2 }}>👑</div>
                  )}
                  {!isFirst && (
                    <div style={{ fontSize: 22, opacity: 0.85 }}>{medalEmoji[rank]}</div>
                  )}

                  {/* 아바타 */}
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: avSize[rank], height: avSize[rank], borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${color}22, #141416)`,
                      border: `${isFirst ? 3 : 2}px solid ${color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: Math.round(avSize[rank] / 2.5),
                      color,
                      boxShadow: `0 0 ${isFirst ? 32 : 16}px ${color}50, inset 0 0 16px ${color}10`,
                    }}>
                      {r.nickname?.[0]?.toUpperCase()}
                    </div>
                    {/* 티어 뱃지 */}
                    <div style={{
                      position: 'absolute', bottom: -5, right: -5,
                      width: 24, height: 24, borderRadius: '50%',
                      background: color, border: '2px solid #0A0A0B',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'Bebas Neue, sans-serif', fontSize: 11, fontWeight: 700,
                      color: rank === 1 ? '#171e00' : '#0A0A0B',
                      boxShadow: `0 0 8px ${color}80`,
                    }}>{rank}</div>
                  </div>

                  {/* 닉네임 */}
                  <p style={{
                    fontFamily: 'Barlow Condensed, sans-serif', fontSize: isFirst ? 15 : 13, fontWeight: 700,
                    color: isFirst ? '#c9f236' : '#e5e2e3',
                    maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textAlign: 'center', textTransform: 'uppercase',
                  }}>{r.nickname}</p>

                  {/* 점수 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: isFirst ? 26 : 20, color, lineHeight: 1, textShadow: `0 0 12px ${color}80` }}>
                      {r.activityScore || Math.round(r.manner_score * 100)}
                    </span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, color: '#4A4A5A', textTransform: 'uppercase' }}>pts</span>
                  </div>

                  {/* 매너 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                    <span style={{ fontSize: 10 }}>⭐</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{r.manner_score?.toFixed(1)}</span>
                  </div>

                  {/* 포디엄 바 */}
                  <div style={{
                    width: '100%', height: barH[rank],
                    background: `linear-gradient(180deg,${color}18 0%,${color}06 100%)`,
                    border: `1px solid ${color}25`, borderBottom: 'none',
                    borderRadius: '12px 12px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    {/* 포디엄 안 빛 줄기 */}
                    <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 1, height: '100%', background: `linear-gradient(180deg,${color}30,transparent)` }} />
                    <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 40, color: `${color}18`, userSelect: 'none' }}>{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 포디엄 바닥 */}
          <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,rgba(201,242,54,0.12) 20%,rgba(201,242,54,0.5) 50%,rgba(201,242,54,0.12) 80%,transparent)', margin: '0 -16px' }} />
        </section>
      )}

      {/* ── 탭 바 ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1E1E22', background: '#0d0d0e', position: 'sticky', top: 64, zIndex: 30 }}>
        {[
          { key: 'all',     label: '전체',    icon: 'public' },
          { key: 'weekly',  label: '이번 주', icon: 'calendar_today' },
          { key: 'monthly', label: '이번 달', icon: 'date_range' },
          { key: 'nearby',  label: '내 주변', icon: 'near_me' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'weekly') setPeriod('weekly');
              if (tab.key === 'monthly') setPeriod('monthly');
            }}
            style={{
              flex: 1, padding: '12px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: activeTab === tab.key ? '#c9f236' : '#4A4A5A',
              borderBottom: `2px solid ${activeTab === tab.key ? '#c9f236' : 'transparent'}`,
              background: 'none', cursor: 'pointer', transition: 'all 0.2s',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: activeTab === tab.key ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 종목 필터 ── */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px 4px', background: '#0d0d0e' }} className="no-scrollbar">
        {[{ id: '', name: 'ALL', icon: 'bolt' }, ...sports.map(s => ({ id: s.id, name: s.name, icon: SPORT_ICONS[s.name] || 'sports' }))].map(s => {
          const active = sportId === s.id;
          return (
            <button key={s.id} onClick={() => setSportId(s.id)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: active ? '#c9f236' : 'rgba(255,255,255,0.03)',
              color: active ? '#171e00' : '#4A4A5A',
              border: `1px solid ${active ? '#c9f236' : '#1E1E22'}`,
              cursor: 'pointer', transition: 'all 0.18s',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{s.icon}</span>
              {s.name}
            </button>
          );
        })}
      </div>

      {/* ── 지역 필터 ── */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 16px 10px', background: '#0d0d0e', borderBottom: '1px solid #1A1A1E' }} className="no-scrollbar">
        {[{ label: '🌍 전체', value: '' }, ...REGIONS.map(r => ({ label: r, value: r }))].map(({ label, value }) => {
          const active = region === value;
          return (
            <button key={value} onClick={() => setRegion(value)} style={{
              flexShrink: 0, padding: '4px 11px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700,
              background: active ? 'rgba(201,242,54,0.12)' : 'transparent',
              color: active ? '#c9f236' : '#3E3E4A',
              border: `1px solid ${active ? 'rgba(201,242,54,0.4)' : '#1E1E22'}`,
              cursor: 'pointer', transition: 'all 0.18s',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── 랭킹 리스트 ── */}
      <div style={{ padding: '12px 16px 0' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 16, background: '#c9f236', borderRadius: 2 }} />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e5e2e3' }}>
              {region ? `${region} 지역` : '전체'} 랭킹
            </span>
          </div>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#2A2A32' }}>
            총 {rankings.length}명
          </span>
        </div>

        {/* 로딩 스켈레톤 */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                height: 76, borderRadius: 16,
                background: 'linear-gradient(90deg,#141416 25%,#1A1A1E 50%,#141416 75%)',
                backgroundSize: '200% 100%',
                border: '1px solid #1E1E22',
                animation: 'shimmer 1.4s infinite',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && rankings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(201,242,54,0.06)', border: '1px solid rgba(201,242,54,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>🏆</div>
            <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#e5e2e3', letterSpacing: '0.06em', marginBottom: 8 }}>아직 랭킹이 없습니다</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#4A4A5A' }}>스팟에 참여하면 랭킹에 등록됩니다</p>
          </div>
        )}

        {/* TOP 3 인라인 (포디엄 없을 때) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rankings.map((r, i) => {
            const rank = i + 1;
            const score = r.activityScore || Math.round(r.manner_score * 100);
            const tier = getTier(score);
            const isMe = myRank?.nickname === r.nickname;
            const isTop3 = rank <= 3;
            const progressPct = Math.min(100, Math.round((score / maxScore) * 100));
            const rankColors: Record<number,string> = { 1: '#c9f236', 2: '#94A3B8', 3: '#CD7F32' };
            const rankColor = rankColors[rank] || tier.color;

            return (
              <div key={r.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: isMe
                    ? 'linear-gradient(135deg,rgba(201,242,54,0.06),rgba(201,242,54,0.02))'
                    : isTop3
                    ? `linear-gradient(135deg,${rankColor}0A,#141416)`
                    : '#111113',
                  border: `1px solid ${isMe ? 'rgba(201,242,54,0.3)' : isTop3 ? `${rankColor}25` : '#1A1A1E'}`,
                  borderLeft: `3px solid ${isTop3 ? rankColor : tier.color}`,
                  borderRadius: 16, padding: '12px 14px',
                  transition: 'all 0.2s',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${tier.color}12`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = '';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                }}
              >
                {/* 배경 점수 바 */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${progressPct}%`, maxWidth: '100%',
                  background: `linear-gradient(90deg,${tier.color}06,transparent)`,
                  pointerEvents: 'none',
                }} />

                {/* 순위 */}
                <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>
                  {isTop3 ? (
                    <span style={{ fontSize: 20 }}>{['🥇','🥈','🥉'][rank-1]}</span>
                  ) : (
                    <span style={{
                      fontFamily: 'Bebas Neue, sans-serif', fontSize: 20,
                      color: rank <= 10 ? tier.color : '#2A2A32',
                    }}>{rank}</span>
                  )}
                </div>

                {/* 아바타 */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%,${tier.color}20,#1A1A1E)`,
                    border: `2px solid ${tier.color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, fontWeight: 700,
                    color: tier.color,
                    boxShadow: isTop3 ? `0 0 12px ${tier.color}30` : 'none',
                  }}>
                    {r.nickname?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 14, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>{tier.icon}</span>
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <p style={{
                      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700,
                      color: isMe ? '#c9f236' : isTop3 ? rankColor : '#e5e2e3',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{r.nickname}</p>
                    {isMe && (
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700, color: '#171e00', background: '#c9f236', borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase', flexShrink: 0 }}>나</span>
                    )}
                    {r.subscription_status === 'premium' && <span style={{ fontSize: 11, flexShrink: 0 }}>👑</span>}
                  </div>

                  {/* 하단 메타 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700,
                      color: tier.color, textTransform: 'uppercase', letterSpacing: '0.04em',
                      background: tier.bg, border: `1px solid ${tier.color}30`,
                      borderRadius: 4, padding: '1px 6px',
                    }}>{tier.icon} {tier.label}</span>
                    <span style={{ width: 1, height: 10, background: '#2A2A32', display: 'inline-block' }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#4A4A5A' }}>
                      🏅 {r.spotCount}회
                    </span>
                    <span style={{ width: 1, height: 10, background: '#2A2A32', display: 'inline-block' }} />
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#4A4A5A' }}>
                      ⭐ {r.manner_score?.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* 점수 */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, lineHeight: 1,
                    color: isTop3 ? rankColor : tier.color,
                    textShadow: isTop3 ? `0 0 16px ${rankColor}60` : 'none',
                  }}>{score}</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, color: '#2A2A32', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PTS</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MY RANK 고정 바 ── */}
      <div style={{
        position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, zIndex: 35,
        background: 'rgba(8,8,9,0.97)', backdropFilter: 'blur(20px)',
        borderTop: `2px solid ${myTier.color}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: `0 -8px 40px ${myTier.glow}`,
      }}>
        <div style={{
          background: myTier.bg, border: `1px solid ${myTier.color}40`,
          borderRadius: 8, padding: '3px 8px',
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: myTier.color, flexShrink: 0,
        }}>MY RANK</div>

        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%,${myTier.color}25,#141416)`,
          border: `2px solid ${myTier.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Bebas Neue, sans-serif', fontSize: 15, fontWeight: 700,
          color: myTier.color, flexShrink: 0,
          boxShadow: `0 0 14px ${myTier.glow}`,
        }}>
          {myRank?.nickname?.[0]?.toUpperCase() || '?'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
            {myRank?.nickname || '로그인 후 확인'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11 }}>{myTier.icon}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: myTier.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{myTier.label}</span>
          </div>
        </div>

        {myRank ? (
          <>
            {myRank.rank > 0 && (
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, color: '#4A4A5A', flexShrink: 0 }}>{myRank.rank}위</span>
            )}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: myTier.color, textShadow: `0 0 12px ${myTier.glow}` }}>{myRank.score}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, color: '#3E3E4A', textTransform: 'uppercase', marginLeft: 3 }}>PTS</span>
            </div>
          </>
        ) : (
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#3E3E4A', flexShrink: 0 }}>아직 랭킹 없음</span>
        )}
      </div>

      {/* ── 하단 내비 ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, height: 68, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px',
        background: 'rgba(8,8,9,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid #1A1A1E', borderRadius: '16px 16px 0 0',
      }}>
        {NAV.map(tab => (
          <Link key={tab.key} href={tab.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, color: tab.active ? '#c9f236' : '#3E3E4A',
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '4px 8px', minWidth: 56, transition: 'color 0.2s',
            filter: tab.active ? 'drop-shadow(0 0 8px rgba(201,242,54,0.4))' : 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: tab.active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
