'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RankEntry {
  id: string; nickname: string; profile_image: string | null;
  manner_score: number; activityScore: number; spotCount: number; rankPosition: number;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [sportId, setSportId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || [])); }, []);
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: period, ...(sportId && { sportId }) });
    fetch(`/api/rankings?${params}`).then(r => r.json()).then(d => setRankings(d.data || [])).finally(() => setLoading(false));
  }, [period, sportId]);

  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
  const mannerColor = (s: number) => s >= 38 ? 'text-emerald-600' : s >= 30 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <h1 className="text-xl font-black text-gray-900">🏆 랭킹</h1>
      </header>

      {/* 기간 선택 */}
      <div className="px-4 pt-4 flex gap-2">
        {(['weekly', 'monthly'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
              period === p ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}>
            {p === 'weekly' ? '주간' : '월간'}
          </button>
        ))}
      </div>

      {/* 종목 필터 */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {[{ id: '', name: '전체' }, ...sports].map(s => (
          <button key={s.id} onClick={() => setSportId(s.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sportId === s.id ? 'bg-primary text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            {s.name}
          </button>
        ))}
      </div>

      {/* 랭킹 목록 */}
      <div className="px-4 space-y-2">
        {loading && <div className="text-center text-gray-400 pt-12">집계 중...</div>}
        {!loading && rankings.length === 0 && <div className="text-center text-gray-400 pt-12">아직 랭킹이 없습니다</div>}
        {rankings.map((r, i) => (
          <div key={r.id} className={`card flex items-center gap-3 ${i < 3 ? 'border border-amber-100 bg-amber-50/30' : ''}`}>
            <span className="text-xl w-8 text-center font-black text-gray-400">
              {medal(i) || `${i + 1}`}
            </span>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {r.nickname?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{r.nickname}</p>
              <p className="text-xs text-gray-400">스팟 {r.spotCount}회 · 활동점수 {r.activityScore}</p>
            </div>
            <span className={`text-sm font-black ${mannerColor(r.manner_score)}`}>★{r.manner_score?.toFixed(1)}</span>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t flex">
        {[['/', '🗺', '스팟'], ['/ranking', '🏆', '랭킹'], ['/mypage', '👤', '마이']].map(([href, icon, label]) => (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2 transition-colors ${href === '/ranking' ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
            <span className="text-xl">{icon}</span>
            <span className="text-xs mt-0.5">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
