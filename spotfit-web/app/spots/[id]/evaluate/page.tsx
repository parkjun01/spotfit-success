'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const CATEGORIES = [
  {
    key: 'time',
    label: '⏰ 시간 약속',
    positive: [
      { key: 'punctual', label: '시간을 칼같이 지켰어요' },
      { key: 'early', label: '미리 와서 준비했어요' },
    ],
    negative: [
      { key: 'late', label: '늦게 도착했어요' },
      { key: 'no_show', label: '노쇼했어요' },
    ],
  },
  {
    key: 'manner',
    label: '😊 태도/매너',
    positive: [
      { key: 'good_manner', label: '매너가 정말 좋았어요' },
      { key: 'friendly', label: '분위기를 밝게 해줬어요' },
      { key: 'meet_again', label: '또 함께하고 싶어요' },
    ],
    negative: [
      { key: 'bad_manner', label: '매너가 나빴어요' },
      { key: 'rude', label: '불쾌한 언행이 있었어요' },
    ],
  },
  {
    key: 'skill',
    label: '💪 운동 실력',
    positive: [
      { key: 'skilled', label: '실력이 뛰어났어요' },
      { key: 'helpful', label: '배울 점이 많았어요' },
    ],
    negative: [
      { key: 'misrepresented', label: '실력을 속였어요' },
      { key: 'unskilled', label: '제시된 레벨과 달랐어요' },
    ],
  },
];

interface EvalState {
  scores: Record<string, boolean | null>; // 'time'|'manner'|'skill' -> true(good)/false(bad)/null
  selectedItems: string[];
  submitted: boolean;
}

interface Participant {
  user_id: string;
  users: { id: string; nickname: string };
}

export default function EvaluatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spot, setSpot] = useState<any>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [evals, setEvals] = useState<Record<string, EvalState>>({});

  const participants: Participant[] = spot?.participations?.filter(
    (p: any) => p.status === 'joined' && p.user_id !== myUserId
  ) || [];

  useEffect(() => {
    const t = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!t) { router.push('/login'); return; }
    setToken(t);
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) setMyUserId(JSON.parse(stored).id);
    fetch(`/api/spots/${id}`).then(r => r.json()).then(d => {
      const s = d.data;
      setSpot(s);
      if (s?.status !== 'completed') { alert('종료된 스팟만 평가할 수 있습니다'); router.back(); }
    }).finally(() => setLoading(false));
  }, [id]);

  const getEval = (uid: string): EvalState =>
    evals[uid] ?? { scores: { time: null, manner: null, skill: null }, selectedItems: [], submitted: false };

  const setScore = (uid: string, cat: string, val: boolean) => {
    setEvals(prev => {
      const ev = { ...getEval(uid) };
      ev.scores = { ...ev.scores, [cat]: ev.scores[cat] === val ? null : val };
      return { ...prev, [uid]: ev };
    });
  };

  const toggleItem = (uid: string, key: string) => {
    setEvals(prev => {
      const ev = { ...getEval(uid) };
      ev.selectedItems = ev.selectedItems.includes(key)
        ? ev.selectedItems.filter(k => k !== key)
        : [...ev.selectedItems, key];
      return { ...prev, [uid]: ev };
    });
  };

  const handleSubmit = async (evaluatedId: string) => {
    const ev = getEval(evaluatedId);
    const scored = Object.values(ev.scores).filter(v => v !== null);
    if (scored.length === 0) { alert('최소 1개 항목을 평가해주세요'); return; }

    const goodCount = Object.values(ev.scores).filter(v => v === true).length;
    const isPositive = goodCount >= Object.values(ev.scores).filter(v => v !== null).length / 2;
    const scoreItems: Record<string, boolean> = {};
    ev.selectedItems.forEach(k => { scoreItems[k] = true; });
    CATEGORIES.forEach(cat => {
      if (ev.scores[cat.key] !== null) scoreItems[cat.key] = ev.scores[cat.key] as boolean;
    });

    setSubmitting(evaluatedId);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spotId: id, evaluatedId, isPositive, scoreItems }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || '평가 실패'); return; }
      setEvals(prev => ({ ...prev, [evaluatedId]: { ...getEval(evaluatedId), submitted: true } }));
    } finally { setSubmitting(null); }
  };

  const allSubmitted = participants.length > 0 && participants.every(p => getEval(p.user_id).submitted);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-extrabold text-gray-900">팀원 평가</h1>
          <p className="text-xs text-gray-400 truncate">{spot?.title}</p>
        </div>
      </header>

      {allSubmitted ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-4 px-8 text-center">
          <span className="text-6xl">🎉</span>
          <p className="text-2xl font-black text-gray-900">평가 완료!</p>
          <p className="text-sm text-gray-500 leading-relaxed">평가 결과가 팀원들의<br />시간약속 · 태도 · 실력 점수에 반영됩니다.</p>
          <button onClick={() => router.push('/')} className="btn-primary mt-2">홈으로</button>
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center pt-24 text-gray-400">평가할 팀원이 없습니다</div>
      ) : (
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500 font-medium">{participants.filter(p => !getEval(p.user_id).submitted).length}명 남음</p>
          {participants.map(p => {
            const ev = getEval(p.user_id);
            if (ev.submitted) return (
              <div key={p.user_id} className="card opacity-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">{p.users?.nickname?.[0]}</div>
                <div><p className="font-bold text-gray-700">{p.users?.nickname}</p><p className="text-xs text-emerald-600 font-semibold">✓ 평가 완료</p></div>
              </div>
            );

            return (
              <div key={p.user_id} className="card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-base">{p.users?.nickname?.[0]}</div>
                  <p className="font-extrabold text-gray-900 text-base">{p.users?.nickname}</p>
                </div>

                {CATEGORIES.map(cat => (
                  <div key={cat.key}>
                    <p className="text-sm font-extrabold text-gray-700 mb-2">{cat.label}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => setScore(p.user_id, cat.key, true)}
                        className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                          ev.scores[cat.key] === true ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >👍 좋았어요</button>
                      <button
                        onClick={() => setScore(p.user_id, cat.key, false)}
                        className={`py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                          ev.scores[cat.key] === false ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200'
                        }`}
                      >👎 아쉬웠어요</button>
                    </div>
                    {ev.scores[cat.key] !== null && (
                      <div className="flex flex-wrap gap-1.5">
                        {(ev.scores[cat.key] ? cat.positive : cat.negative).map(item => (
                          <button
                            key={item.key}
                            onClick={() => toggleItem(p.user_id, item.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              ev.selectedItems.includes(item.key)
                                ? ev.scores[cat.key] ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}
                          >{item.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex gap-2 mb-3">
                    {CATEGORIES.map(cat => (
                      <div key={cat.key} className={`flex-1 h-1.5 rounded-full ${
                        ev.scores[cat.key] === true ? 'bg-emerald-400' :
                        ev.scores[cat.key] === false ? 'bg-red-400' : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                  <button
                    onClick={() => handleSubmit(p.user_id)}
                    disabled={submitting === p.user_id || Object.values(ev.scores).every(v => v === null)}
                    className="w-full btn-primary py-3"
                  >
                    {submitting === p.user_id ? '제출 중...' : '평가 제출 →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
