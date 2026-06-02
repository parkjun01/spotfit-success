'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SeedPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [spotIds, setSpotIds] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const createSpots = async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { alert('로그인이 필요합니다'); router.push('/login'); return; }

    setStatus('loading');
    setLog([]);
    setSpotIds([]);

    // 1. 종목 목록 가져오기
    addLog('종목 목록 조회 중...');
    const sportsRes = await fetch('/api/sports');
    const sportsData = await sportsRes.json();
    const sports: { id: string; name: string }[] = sportsData.data || [];
    const getSportId = (name: string) => sports.find(s => s.name === name)?.id;

    addLog(`종목 ${sports.length}개 확인 완료`);

    // 충북대 주변 테스트 스팟 목록
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const fmt = (d: Date, h: number) => {
      const t = new Date(d);
      t.setHours(h, 0, 0, 0);
      return t.toISOString().slice(0, 16);
    };

    const testSpots = [
      {
        sportId: getSportId('농구'),
        title: '충북대 농구 같이해요',
        description: '충북대 체육관 앞에서 3:3 농구 하실 분 구합니다. 실력 무관, 즐겁게!',
        locationName: '충북대학교 체육관',
        latitude: 36.6285, longitude: 127.4566,
        maxParticipants: 6, difficultyLevel: 'beginner',
        startsAt: fmt(tomorrow, 18),
      },
      {
        sportId: getSportId('축구'),
        title: '충북대 풋살 모집',
        description: '5:5 풋살 하실 분! 충북대 운동장에서 가볍게 즐겨요.',
        locationName: '충북대학교 운동장',
        latitude: 36.6295, longitude: 127.4580,
        maxParticipants: 10, difficultyLevel: 'intermediate',
        startsAt: fmt(tomorrow, 17),
      },
      {
        sportId: getSportId('러닝'),
        title: '무심천 저녁 러닝',
        description: '무심천 변 5km 함께 달려요. 페이스는 6분대로 맞춥니다.',
        locationName: '무심천 생태공원',
        latitude: 36.6350, longitude: 127.4480,
        maxParticipants: 8, difficultyLevel: 'beginner',
        startsAt: fmt(tomorrow, 19),
      },
      {
        sportId: getSportId('배드민턴'),
        title: '충북대 배드민턴 크루',
        description: '매주 배드민턴 치는 모임입니다. 오늘 빈자리 있어요!',
        locationName: '청주 실내체육관',
        latitude: 36.6320, longitude: 127.4600,
        maxParticipants: 4, difficultyLevel: 'intermediate',
        startsAt: fmt(tomorrow, 20),
      },
      {
        sportId: getSportId('헬스'),
        title: '헬스장 같이 다녀요',
        description: '충북대 근처 헬스장 파트너 구합니다. 서로 동기부여 해봐요!',
        locationName: '충북대 앞 헬스장',
        latitude: 36.6275, longitude: 127.4555,
        maxParticipants: 2, difficultyLevel: 'beginner',
        startsAt: fmt(tomorrow, 7),
      },
    ];

    const created: string[] = [];

    for (const spot of testSpots) {
      if (!spot.sportId) {
        addLog(`⚠️ ${spot.title} — 종목 ID 없음, 건너뜀`);
        continue;
      }
      addLog(`📍 생성 중: ${spot.title}`);
      try {
        const res = await fetch('/api/spots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(spot),
        });
        const data = await res.json();
        if (data.data?.spotId) {
          created.push(data.data.spotId);
          addLog(`✅ 생성 완료: ${spot.title} (ID: ${data.data.spotId.slice(0, 8)}...)`);
        } else {
          addLog(`❌ 실패: ${spot.title} — ${data.message || JSON.stringify(data)}`);
        }
      } catch (e: any) {
        addLog(`❌ 오류: ${spot.title} — ${e.message}`);
      }
    }

    setSpotIds(created);
    setStatus(created.length > 0 ? 'done' : 'error');
    addLog(`\n완료: ${created.length}/${testSpots.length}개 생성`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#131314', padding: 24 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', marginBottom: 8 }}>테스트 스팟 생성</h1>
        <p style={{ fontSize: 13, color: '#8A8A9A', marginBottom: 24 }}>충북대 근처 5개의 테스트 스팟을 생성합니다.<br/>생성된 스팟은 내 스팟 이력에서 삭제할 수 있습니다.</p>

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
          <div style={{ background: '#0A0A0B', border: '1px solid #2A2A32', borderRadius: 12, padding: 16, marginTop: 16, fontFamily: 'DM Sans, monospace', fontSize: 12, lineHeight: 1.8, color: '#c5c9ae', whiteSpace: 'pre-wrap' }}>
            {log.join('\n')}
          </div>
        )}

        {status === 'done' && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(201,242,54,0.08)', border: '1px solid rgba(201,242,54,0.3)', borderRadius: 12, padding: 14, color: '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14 }}>
              ✅ {spotIds.length}개 스팟 생성 완료! 지도뷰에서 충북대 근처를 확인해보세요.
            </div>
            <button onClick={() => router.push('/?view=map')} style={{ height: 48, background: '#c9f236', color: '#171e00', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
              지도에서 확인하기 →
            </button>
            <button onClick={() => router.push('/mypage/spots')} style={{ height: 48, background: '#1E1E22', color: '#8A8A9A', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', border: '1px solid #2A2A32', cursor: 'pointer' }}>
              내 스팟 이력에서 삭제하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
