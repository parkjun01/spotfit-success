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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#131314' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 32 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: '#c9f236', letterSpacing: '0.05em' }}>팀원 평가</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spot?.title}</p>
        </div>
      </header>

      {allSubmitted ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 96, gap: 16, padding: '96px 32px 0', textAlign: 'center' }}>
          <span style={{ fontSize: 56 }}>🎉</span>
          <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: '#c9f236' }}>평가 완료!</p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8A8A9A', lineHeight: 1.6 }}>평가 결과가 팀원들의<br/>시간약속 · 태도 · 실력 점수에 반영됩니다.</p>
          <button onClick={() => router.push('/')} style={{ marginTop: 8, height: 50, padding: '0 32px', background: '#c9f236', color: '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', border: 'none', borderRadius: 12, cursor: 'pointer' }}>홈으로</button>
        </div>
      ) : participants.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 96, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8A8A9A' }}>평가할 팀원이 없습니다</div>
      ) : (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A' }}>
            {participants.filter(p => !getEval(p.user_id).submitted).length}명 남음
          </p>
          {participants.map(p => {
            const ev = getEval(p.user_id);
            if (ev.submitted) return (
              <div key={p.user_id} style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>{p.users?.nickname?.[0]}</div>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#e5e2e3' }}>{p.users?.nickname}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#22C55E', fontWeight: 600 }}>✓ 평가 완료</p>
                </div>
              </div>
            );

            return (
              <div key={p.user_id} style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#c9f236', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: '#171e00' }}>{p.users?.nickname?.[0]}</div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#ffffef' }}>{p.users?.nickname}</p>
                </div>

                {CATEGORIES.map(cat => (
                  <div key={cat.key}>
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#c5c9ae', textTransform: 'uppercase', marginBottom: 10 }}>{cat.label}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <button onClick={() => setScore(p.user_id, cat.key, true)} style={{ padding: '10px 0', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, border: `2px solid ${ev.scores[cat.key] === true ? '#22C55E' : '#2A2A32'}`, background: ev.scores[cat.key] === true ? 'rgba(34,197,94,0.15)' : '#1E1E22', color: ev.scores[cat.key] === true ? '#22C55E' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s' }}>👍 좋았어요</button>
                      <button onClick={() => setScore(p.user_id, cat.key, false)} style={{ padding: '10px 0', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, border: `2px solid ${ev.scores[cat.key] === false ? '#EF4444' : '#2A2A32'}`, background: ev.scores[cat.key] === false ? 'rgba(239,68,68,0.15)' : '#1E1E22', color: ev.scores[cat.key] === false ? '#EF4444' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s' }}>👎 아쉬웠어요</button>
                    </div>
                    {ev.scores[cat.key] !== null && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(ev.scores[cat.key] ? cat.positive : cat.negative).map(item => {
                          const sel = ev.selectedItems.includes(item.key);
                          const isGood = ev.scores[cat.key] === true;
                          return (
                            <button key={item.key} onClick={() => toggleItem(p.user_id, item.key)} style={{ padding: '5px 12px', borderRadius: 999, fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', border: `1px solid ${sel ? (isGood ? '#22C55E' : '#EF4444') : '#2A2A32'}`, background: sel ? (isGood ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)') : '#1E1E22', color: sel ? (isGood ? '#22C55E' : '#EF4444') : '#8A8A9A' }}>{item.label}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ paddingTop: 12, borderTop: '1px solid #2A2A32' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {CATEGORIES.map(cat => (
                      <div key={cat.key} style={{ flex: 1, height: 4, borderRadius: 999, background: ev.scores[cat.key] === true ? '#22C55E' : ev.scores[cat.key] === false ? '#EF4444' : '#2A2A32' }} />
                    ))}
                  </div>
                  <button onClick={() => handleSubmit(p.user_id)} disabled={submitting === p.user_id || Object.values(ev.scores).every(v => v === null)} style={{ width: '100%', height: 50, background: Object.values(ev.scores).every(v => v === null) ? '#2a2a2b' : '#c9f236', color: Object.values(ev.scores).every(v => v === null) ? '#3E3E4A' : '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', borderRadius: 12, cursor: Object.values(ev.scores).every(v => v === null) ? 'default' : 'pointer', transition: 'all 0.2s' }}>
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
