'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// 충북대 개신캠퍼스 근처 시연용 스팟
const DEMO_SPOTS = [
  {
    sport: '농구',
    title: '개신캠 3:3 픽업게임',
    description: '충북대 체육관 앞 야외 코트에서 3:3 풀코트 픽업게임! 포지션 무관, 실력 무관. 캐주얼하게 즐겨요 🏀',
    location: '충북대학교 체육관 앞 농구코트',
    lat: 36.6281, lng: 127.4571,
    participants: 6, difficulty: 'beginner', hour: 18,
  },
  {
    sport: '풋살',
    title: '충대 저녁 풋살 모집',
    description: '5:5 풋살 하실 분 모집합니다. 충북대 운동장 인조잔디 구장에서 진행해요. 실내화 지참 필수!',
    location: '충북대학교 학생생활관 풋살장',
    lat: 36.6272, lng: 127.4558,
    participants: 10, difficulty: 'intermediate', hour: 19,
  },
  {
    sport: '러닝',
    title: '무심천 황혼 러닝크루',
    description: '무심천 자전거길 따라 5km 달려요. 페이스 5\'30\"~6\'00\"/km 목표. 초보자 환영, 같이 완주해요 🏃',
    location: '무심천 생태공원 (충대 북문 방면)',
    lat: 36.6355, lng: 127.4472,
    participants: 8, difficulty: 'beginner', hour: 18,
  },
  {
    sport: '배드민턴',
    title: '개신관 배드민턴 복식 파트너',
    description: '복식 연습하실 분! 충북대 실내체육관 배드민턴 코트 예약했어요. 셔틀콕 제공합니다 🏸',
    location: '충북대학교 실내체육관',
    lat: 36.6289, lng: 127.4583,
    participants: 4, difficulty: 'intermediate', hour: 20,
  },
  {
    sport: '헬스',
    title: '충대 앞 헬스 스터디버디',
    description: '운동 루틴 같이 하실 분! 서로 동기부여하며 꾸준히 가봐요. 초보자 歡迎 💪',
    location: '충북대 정문 앞 피트니스센터',
    lat: 36.6264, lng: 127.4542,
    participants: 2, difficulty: 'beginner', hour: 7,
  },
  {
    sport: '테니스',
    title: '개신캠 테니스 더블스',
    description: '테니스 더블스 파트너 구합니다. 코트 예약 완료. 라켓 없어도 빌려드려요 🎾',
    location: '충북대학교 테니스장',
    lat: 36.6277, lng: 127.4594,
    participants: 4, difficulty: 'intermediate', hour: 17,
  },
  {
    sport: '클라이밍',
    title: '충청대 클라이밍 초보반',
    description: '클라이밍 처음이라 무서우신 분들! 같이 입문해봐요. 안전교육 포함, 장비 대여 가능 🧗',
    location: '청주 실내 클라이밍 짐 (개신동)',
    lat: 36.6301, lng: 127.4612,
    participants: 6, difficulty: 'beginner', hour: 15,
  },
];

export default function SeedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [created, setCreated] = useState<string[]>([]);
  const [rankStatus, setRankStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [rankLog, setRankLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const createSpots = async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { alert('로그인이 필요합니다'); router.push('/login'); return; }

    setStatus('loading');
    setLog([]);
    setCreated([]);

    addLog('종목 목록 조회 중...');
    const sportsRes = await fetch('/api/sports');
    const sportsData = await sportsRes.json();
    const sports: { id: string; name: string }[] = sportsData.data || [];
    const getSportId = (name: string) => sports.find(s => s.name === name)?.id;
    addLog(`✅ 종목 ${sports.length}개 확인`);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ids: string[] = [];

    for (const spot of DEMO_SPOTS) {
      const sportId = getSportId(spot.sport);
      if (!sportId) { addLog(`⚠️ ${spot.sport} 종목 없음, 건너뜀`); continue; }

      const starts = new Date(tomorrow);
      starts.setHours(spot.hour, 0, 0, 0);

      addLog(`📍 생성 중: ${spot.title}`);
      try {
        const res = await fetch('/api/spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sportId,
            title: spot.title,
            description: spot.description,
            locationName: spot.location,
            latitude: spot.lat,
            longitude: spot.lng,
            maxParticipants: spot.participants,
            difficultyLevel: spot.difficulty,
            startsAt: starts.toISOString().slice(0, 16),
          }),
        });
        const data = await res.json();
        if (data.data?.spotId) {
          ids.push(data.data.spotId);
          addLog(`✅ ${spot.title}`);
        } else {
          addLog(`❌ 실패: ${spot.title} — ${data.message || '오류'}`);
        }
      } catch (e: any) {
        addLog(`❌ 오류: ${e.message}`);
      }
    }

    setCreated(ids);
    setStatus(ids.length > 0 ? 'done' : 'error');
    addLog(`\n완료: ${ids.length}/${DEMO_SPOTS.length}개 생성`);
  };

  const createRankings = async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { alert('로그인이 필요합니다'); return; }
    setRankStatus('loading');
    setRankLog(['랭킹 데이터 생성 중...']);
    try {
      const res = await fetch('/api/admin/seed-rankings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRankLog(data.data?.log || ['완료']);
      setRankStatus('done');
    } catch {
      setRankLog(['오류 발생']);
      setRankStatus('idle');
    }
  };

  const deleteRankings = async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token || !confirm('랭킹 테스트 데이터를 모두 삭제할까요?')) return;
    const res = await fetch('/api/admin/seed-rankings', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    alert(data.data?.message || '삭제 완료');
    setRankStatus('idle');
    setRankLog([]);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#131314', padding: 24 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', marginBottom: 4 }}>시연용 스팟 생성</h1>
        <p style={{ fontSize: 13, color: '#8A8A9A', marginBottom: 24, lineHeight: 1.6 }}>
          충북대학교 개신캠퍼스 근처 <strong style={{ color: '#c9f236' }}>7개</strong> 스팟을 생성합니다.<br/>
          농구 · 풋살 · 러닝 · 배드민턴 · 헬스 · 테니스 · 클라이밍
        </p>

        {/* 스팟 미리보기 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {DEMO_SPOTS.map((s, i) => (
            <div key={i} style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>
                {s.sport === '농구' ? '🏀' : s.sport === '풋살' ? '⚽' : s.sport === '러닝' ? '🏃' : s.sport === '배드민턴' ? '🏸' : s.sport === '헬스' ? '💪' : s.sport === '테니스' ? '🎾' : '🧗'}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#e5e2e3', fontSize: 14, margin: 0 }}>{s.title}</p>
                <p style={{ fontSize: 11, color: '#8A8A9A', margin: 0 }}>{s.location} · {s.hour}:00 · {s.participants}명</p>
              </div>
            </div>
          ))}
        </div>

        {status === 'idle' && (
          <button onClick={createSpots} style={{ width: '100%', height: 52, background: '#c9f236', color: '#171e00', borderRadius: 12, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
            스팟 생성 시작
          </button>
        )}

        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 20, height: 20, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14 }}>생성 중...</span>
          </div>
        )}

        {log.length > 0 && (
          <div style={{ background: '#0A0A0B', border: '1px solid #2A2A32', borderRadius: 12, padding: 16, marginTop: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, color: '#c5c9ae', whiteSpace: 'pre-wrap' }}>
            {log.join('\n')}
          </div>
        )}

        {status === 'done' && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(201,242,54,0.08)', border: '1px solid rgba(201,242,54,0.3)', borderRadius: 12, padding: 14, color: '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14 }}>
              🎉 {created.length}개 스팟 생성 완료! 지도에서 개신캠퍼스 근처를 확인해보세요.
            </div>
            <button onClick={() => router.push('/')} style={{ height: 48, background: '#c9f236', color: '#171e00', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
              지도에서 확인하기 →
            </button>
            <button onClick={async () => {
              const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
              if (!token) return;
              if (!confirm(`생성한 스팟 ${created.length}개를 모두 삭제할까요?`)) return;
              for (const id of created) {
                await fetch(`/api/spots/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
              }
              alert('삭제 완료!');
              setStatus('idle');
              setCreated([]);
              setLog([]);
            }} style={{ height: 44, background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
              🗑 시연 스팟 전체 삭제
            </button>
          </div>
        )}
        {/* 랭킹 시드 섹션 */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #2A2A32' }}>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#c9f236', marginBottom: 4 }}>랭킹 테스트 데이터</h2>
          <p style={{ fontSize: 13, color: '#8A8A9A', marginBottom: 16, lineHeight: 1.6 }}>
            랭킹 시연용 가상 유저 6명을 생성합니다.<br/>
            각자 다른 수의 완료 스팟을 가져 순위가 형성됩니다.
          </p>

          {/* 미리보기 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {[
              { name: '김민준', score: 60, spots: 6 },
              { name: '이지은', score: 50, spots: 5 },
              { name: '박서준', score: 40, spots: 4 },
              { name: '최유나', score: 30, spots: 3 },
              { name: '정현우', score: 30, spots: 3 },
              { name: '강다현', score: 20, spots: 2 },
            ].map((u, i) => (
              <div key={i} style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: i === 0 ? '#c9f236' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#8A8A9A', width: 24 }}>{i + 1}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, color: '#e5e2e3', flex: 1 }}>{u.name}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#8A8A9A' }}>스팟 {u.spots}회</span>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, color: '#c9f236' }}>{u.score}pts</span>
              </div>
            ))}
          </div>

          {rankStatus === 'idle' && (
            <button onClick={createRankings} style={{ width: '100%', height: 48, background: '#1E1E22', color: '#c9f236', borderRadius: 12, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', border: '1px solid rgba(201,242,54,0.3)', cursor: 'pointer' }}>
              랭킹 데이터 생성
            </button>
          )}

          {rankStatus === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 18, height: 18, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14 }}>생성 중...</span>
            </div>
          )}

          {rankLog.length > 0 && (
            <div style={{ background: '#0A0A0B', border: '1px solid #2A2A32', borderRadius: 10, padding: 14, marginTop: 12, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8, color: '#c5c9ae', whiteSpace: 'pre-wrap' }}>
              {rankLog.join('\n')}
            </div>
          )}

          {rankStatus === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <button onClick={() => router.push('/ranking')} style={{ height: 44, background: '#c9f236', color: '#171e00', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
                랭킹 페이지에서 확인하기 →
              </button>
              <button onClick={deleteRankings} style={{ height: 40, background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                🗑 랭킹 테스트 데이터 삭제
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
