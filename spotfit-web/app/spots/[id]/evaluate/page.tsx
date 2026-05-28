'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const POSITIVE_ITEMS = [
  { key: 'punctual', label: '⏰ 시간을 잘 지켰어요' },
  { key: 'good_manner', label: '😊 매너가 좋았어요' },
  { key: 'skilled', label: '💪 실력이 좋았어요' },
  { key: 'meet_again', label: '🤝 또 함께하고 싶어요' },
];

const NEGATIVE_ITEMS = [
  { key: 'no_show', label: '😤 늦거나 노쇼했어요' },
  { key: 'bad_manner', label: '😠 매너가 나빴어요' },
  { key: 'misrepresented', label: '🙅 실력을 속였어요' },
];

interface Participant {
  user_id: string;
  users: { id: string; nickname: string; profile_image: string | null };
}

interface EvalState {
  isPositive: boolean | null;
  selectedItems: string[];
  submitted: boolean;
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

  const getEval = (userId: string): EvalState =>
    evals[userId] ?? { isPositive: null, selectedItems: [], submitted: false };

  const setEvalField = (userId: string, updates: Partial<EvalState>) => {
    setEvals(prev => ({ ...prev, [userId]: { ...getEval(userId), ...updates } }));
  };

  const toggleItem = (userId: string, key: string) => {
    const curr = getEval(userId);
    setEvalField(userId, {
      selectedItems: curr.selectedItems.includes(key)
        ? curr.selectedItems.filter(k => k !== key)
        : [...curr.selectedItems, key],
    });
  };

  const handleSubmit = async (evaluatedId: string) => {
    const ev = getEval(evaluatedId);
    if (ev.isPositive === null) return alert('긍정/부정을 선택해주세요');
    setSubmitting(evaluatedId);
    try {
      const scoreItems: Record<string, boolean> = {};
      ev.selectedItems.forEach(k => { scoreItems[k] = true; });

      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spotId: id, evaluatedId, isPositive: ev.isPositive, scoreItems }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || '평가 실패'); return; }
      setEvalField(evaluatedId, { submitted: true });
    } finally { setSubmitting(null); }
  };

  const allSubmitted = participants.length > 0 && participants.every(p => getEval(p.user_id).submitted);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">팀원 평가</h1>
          <p className="text-xs text-gray-400 truncate">{spot?.title}</p>
        </div>
      </header>

      {allSubmitted ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-4 px-8 text-center">
          <span className="text-5xl">🎉</span>
          <p className="text-xl font-black text-gray-900">평가 완료!</p>
          <p className="text-sm text-gray-500">모든 팀원 평가가 완료되었습니다.<br />평가 결과가 매너 점수에 반영됩니다.</p>
          <button onClick={() => router.push('/')} className="btn-primary mt-4">홈으로</button>
        </div>
      ) : participants.length === 0 ? (
        <div className="text-center pt-24 text-gray-400">평가할 팀원이 없습니다</div>
      ) : (
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">{participants.filter(p => !getEval(p.user_id).submitted).length}명 남음</p>
          {participants.map(p => {
            const ev = getEval(p.user_id);
            if (ev.submitted) return (
              <div key={p.user_id} className="card opacity-60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                  {p.users?.nickname?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-700">{p.users?.nickname}</p>
                  <p className="text-xs text-emerald-600">✓ 평가 완료</p>
                </div>
              </div>
            );

            return (
              <div key={p.user_id} className="card space-y-3">
                {/* 사용자 */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold">
                    {p.users?.nickname?.[0]}
                  </div>
                  <p className="font-bold text-gray-900">{p.users?.nickname}</p>
                </div>

                {/* 긍정/부정 선택 */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEvalField(p.user_id, { isPositive: true, selectedItems: [] })}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-colors ${
                      ev.isPositive === true
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    👍 좋았어요
                  </button>
                  <button
                    onClick={() => setEvalField(p.user_id, { isPositive: false, selectedItems: [] })}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition-colors ${
                      ev.isPositive === false
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                    }`}
                  >
                    👎 아쉬웠어요
                  </button>
                </div>

                {/* 세부 항목 */}
                {ev.isPositive !== null && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">세부 항목 선택 (선택사항)</p>
                    <div className="flex flex-wrap gap-2">
                      {(ev.isPositive ? POSITIVE_ITEMS : NEGATIVE_ITEMS).map(item => (
                        <button
                          key={item.key}
                          onClick={() => toggleItem(p.user_id, item.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            ev.selectedItems.includes(item.key)
                              ? ev.isPositive
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleSubmit(p.user_id)}
                      disabled={submitting === p.user_id}
                      className="w-full btn-primary text-sm py-2.5"
                    >
                      {submitting === p.user_id ? '제출 중...' : '평가 제출'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
