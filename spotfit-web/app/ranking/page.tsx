'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RankEntry {
  id: string; nickname: string; manner_score: number;
  activityScore: number; spotCount: number; subscription_status?: string;
}

const AGE_FILTERS = ['전체', '20대', '30대', '40대'];
const GENDER_FILTERS = ['전체', '남성', '여성'];

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [sportId, setSportId] = useState('');
  const [ageFilter, setAgeFilter] = useState('전체');
  const [genderFilter, setGenderFilter] = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || [])); }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      type: period,
      ...(sportId && { sportId }),
      ...(ageFilter !== '전체' && { age: ageFilter }),
      ...(genderFilter !== '전체' && { gender: genderFilter }),
    });
    fetch(`/api/rankings?${params}`)
      .then(r => r.json())
      .then(d => setRankings(d.data || []))
      .finally(() => setLoading(false));
  }, [period, sportId, ageFilter, genderFilter]);

  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
  const mannerColor = (s: number) => s >= 38 ? 'text-emerald-600' : s >= 30 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-gray-900">랭킹 <span className="text-primary">보드</span></h1>
      </header>

      {/* 기간 선택 */}
      <div className="px-4 pt-4 flex gap-2">
        {(['weekly', 'monthly'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-colors ${
              period === p ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-400 border border-gray-200'
            }`}>
            {p === 'weekly' ? '이번 주' : '이번 달'}
          </button>
        ))}
      </div>

      {/* 종목 필터 */}
      <div className="px-4 pt-3 flex gap-2 overflow-x-auto scrollbar-none">
        {[{ id: '', name: '전체 종목' }, ...sports].map(s => (
          <button key={s.id} onClick={() => setSportId(s.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              sportId === s.id ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* 나이/성별 필터 */}
      <div className="px-4 pt-2 flex gap-4">
        <div className="flex gap-1">
          {AGE_FILTERS.map(a => (
            <button key={a} onClick={() => setAgeFilter(a)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                ageFilter === a ? 'bg-gray-800 text-white' : 'bg-white text-gray-400 border border-gray-200'
              }`}>{a}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {GENDER_FILTERS.map(g => (
            <button key={g} onClick={() => setGenderFilter(g)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                genderFilter === g ? 'bg-gray-800 text-white' : 'bg-white text-gray-400 border border-gray-200'
              }`}>{g}</button>
          ))}
        </div>
      </div>

      {/* TOP 3 표창 */}
      {!loading && rankings.length >= 3 && (
        <div className="px-4 pt-4">
          <div className="flex items-end justify-center gap-3">
            {[rankings[1], rankings[0], rankings[2]].map((r, idx) => {
              const pos = idx === 0 ? 1 : idx === 1 ? 0 : 2;
              const heights = ['h-20', 'h-28', 'h-16'];
              const sizes = ['w-12 h-12', 'w-16 h-16', 'w-10 h-10'];
              const medals = ['🥈', '🥇', '🥉'];
              return r ? (
                <div key={r.id} className="flex flex-col items-center gap-1">
                  <div className={`${sizes[idx]} rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-lg`}>
                    {r.nickname?.[0]}
                  </div>
                  <p className="text-xs font-bold text-gray-700 max-w-[60px] truncate text-center">{r.nickname}</p>
                  <p className={`text-xs font-black ${mannerColor(r.manner_score)}`}>★{r.manner_score?.toFixed(1)}</p>
                  <div className={`w-full ${heights[idx]} rounded-t-xl flex items-center justify-center text-2xl ${
                    pos === 0 ? 'bg-amber-100' : pos === 1 ? 'bg-gray-100' : 'bg-orange-100'
                  }`}>
                    {medals[idx]}
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* 랭킹 목록 */}
      <div className="px-4 pt-3 space-y-2">
        {loading && (
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
          </div>
        )}
        {!loading && rankings.length === 0 && (
          <div className="text-center pt-12 text-gray-400">아직 랭킹 데이터가 없습니다</div>
        )}
        {rankings.map((r, i) => (
          <div key={r.id} className={`bg-white rounded-2xl border px-4 py-3 flex items-center gap-3 ${
            i < 3 ? 'border-amber-100' : 'border-gray-100'
          }`}>
            <span className="text-xl w-8 text-center font-black text-gray-300">
              {medal(i) || <span className="text-sm text-gray-400">{i + 1}</span>}
            </span>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-extrabold">
              {r.nickname?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-gray-900 truncate">{r.nickname}</p>
                {r.subscription_status === 'premium' && (
                  <span className="text-xs">👑</span>
                )}
              </div>
              <p className="text-xs text-gray-400">스팟 {r.spotCount}회 · 활동 {r.activityScore}점</p>
            </div>
            <span className={`text-base font-black ${mannerColor(r.manner_score)}`}>★{r.manner_score?.toFixed(1)}</span>
          </div>
        ))}
      </div>

      <BottomNav active="ranking" />
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
  const tabs = [
    { href: '/', key: 'home', label: '스팟', icon: <MapIcon /> },
    { href: '/benefits', key: 'benefits', label: '혜택', icon: <GiftIcon /> },
    { href: '/ranking', key: 'ranking', label: '랭킹', icon: <TrophyIcon /> },
    { href: '/mypage', key: 'mypage', label: '마이', icon: <UserIcon /> },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-20">
      {tabs.map(t => (
        <Link key={t.key} href={t.href} className={`flex-1 flex flex-col items-center py-2.5 transition-colors ${active === t.key ? 'text-primary' : 'text-gray-300'}`}>
          <div className="w-6 h-6">{t.icon}</div>
          <span className="text-xs mt-0.5 font-semibold">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
function MapIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>; }
function GiftIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>; }
function TrophyIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>; }
function UserIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
