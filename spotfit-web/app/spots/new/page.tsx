'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Sport { id: string; name: string; }

export default function NewSpotPage() {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    sportId: '',
    title: '',
    description: '',
    locationName: '',
    latitude: '',
    longitude: '',
    maxParticipants: '10',
    difficultyLevel: 'beginner',
    date: '',
    time: '',
    minAge: '',
    maxAge: '',
  });

  const [hostNickname, setHostNickname] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setHostNickname(user.nickname || '');
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
  }, []);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const useCurrentLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('latitude', String(pos.coords.latitude));
        set('longitude', String(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setError('위치 권한을 허용해주세요');
        setLocating(false);
      }
    );
  };

  const handleSubmit = async () => {
    if (!form.sportId) return setError('종목을 선택해주세요');
    if (!form.title.trim()) return setError('제목을 입력해주세요');
    if (!form.locationName.trim()) return setError('장소명을 입력해주세요');
    if (!form.latitude || !form.longitude) return setError('현재 위치를 가져와주세요');
    if (!form.date || !form.time) return setError('날짜와 시간을 선택해주세요');
    if (form.minAge && form.maxAge && Number(form.minAge) > Number(form.maxAge)) {
      return setError('최소 나이가 최대 나이보다 클 수 없습니다');
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sportId: form.sportId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          locationName: form.locationName.trim(),
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          maxParticipants: parseInt(form.maxParticipants),
          difficultyLevel: form.difficultyLevel,
          startsAt: `${form.date}T${form.time}:00`,
          minAge: form.minAge ? parseInt(form.minAge) : null,
          maxAge: form.maxAge ? parseInt(form.maxAge) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '오류가 발생했습니다');
      router.push(`/spots/${data.data.spotId}`);
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-lg font-bold text-gray-900">스팟 생성</h1>
      </header>

      <div className="p-4 space-y-4 pb-32">

        {/* 팀장 표시 */}
        <div className="card">
          <p className="text-xs font-medium text-gray-500 mb-1">팀장</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
              {hostNickname?.[0] || '?'}
            </div>
            <span className="font-semibold text-gray-800">{hostNickname || '로딩 중...'}</span>
            <span className="text-xs text-gray-400 ml-1">(나)</span>
          </div>
        </div>

        {/* 종목 */}
        <div className="card space-y-3">
          <p className="text-sm font-bold text-gray-800">종목 <span className="text-red-400">*</span></p>
          <div className="grid grid-cols-3 gap-2">
            {sports.map(s => (
              <button
                key={s.id}
                onClick={() => set('sportId', s.id)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  form.sportId === s.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="card space-y-3">
          <p className="text-sm font-bold text-gray-800">기본 정보</p>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              className="input w-full"
              placeholder="예: 강남 풋살 같이해요"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">설명 (선택)</label>
            <textarea
              className="input w-full resize-none"
              placeholder="스팟에 대한 설명을 입력해주세요"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              maxLength={300}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">난이도</label>
            <div className="flex gap-2">
              {[['beginner', '초급'], ['intermediate', '중급'], ['advanced', '고급']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => set('difficultyLevel', val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.difficultyLevel === val
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 인원 */}
        <div className="card space-y-3">
          <p className="text-sm font-bold text-gray-800">인원수 <span className="text-red-400">*</span></p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => set('maxParticipants', String(Math.max(2, parseInt(form.maxParticipants) - 1)))}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 text-xl font-bold flex items-center justify-center"
            >
              −
            </button>
            <span className="text-2xl font-bold text-gray-900 w-16 text-center">
              {form.maxParticipants}명
            </span>
            <button
              onClick={() => set('maxParticipants', String(Math.min(50, parseInt(form.maxParticipants) + 1)))}
              className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 text-xl font-bold flex items-center justify-center"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-400">최소 2명 · 최대 50명 (본인 포함)</p>
        </div>

        {/* 날짜 & 시간 */}
        <div className="card space-y-3">
          <p className="text-sm font-bold text-gray-800">날짜 & 시간 <span className="text-red-400">*</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">날짜</label>
              <input
                className="input w-full"
                type="date"
                value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">시간</label>
              <input
                className="input w-full"
                type="time"
                value={form.time}
                onChange={e => set('time', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 장소 */}
        <div className="card space-y-3">
          <p className="text-sm font-bold text-gray-800">장소 <span className="text-red-400">*</span></p>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">장소명</label>
            <input
              className="input w-full"
              placeholder="예: 강남구 청담동 풋살장"
              value={form.locationName}
              onChange={e => set('locationName', e.target.value)}
            />
          </div>
          <button
            onClick={useCurrentLocation}
            disabled={locating}
            className="w-full py-2.5 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {locating ? '위치 가져오는 중...' : '📍 현재 위치 사용'}
          </button>
          {form.latitude && form.longitude && (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ 위치 설정됨 ({parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)})
            </p>
          )}
        </div>

        {/* 나이 제한 */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">나이 제한</p>
            <span className="text-xs text-gray-400">선택사항</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">최소 나이</label>
              <div className="relative">
                <input
                  className="input w-full pr-8"
                  type="number"
                  placeholder="제한 없음"
                  value={form.minAge}
                  min={10}
                  max={80}
                  onChange={e => set('minAge', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">세</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">최대 나이</label>
              <div className="relative">
                <input
                  className="input w-full pr-8"
                  type="number"
                  placeholder="제한 없음"
                  value={form.maxAge}
                  min={10}
                  max={80}
                  onChange={e => set('maxAge', e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">세</span>
              </div>
            </div>
          </div>
          {(form.minAge || form.maxAge) && (
            <p className="text-xs text-indigo-600">
              {form.minAge && form.maxAge
                ? `${form.minAge}세 ~ ${form.maxAge}세만 참여 가능`
                : form.minAge
                ? `${form.minAge}세 이상만 참여 가능`
                : `${form.maxAge}세 이하만 참여 가능`}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-4 py-4">
        <button
          className="btn-primary w-full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '생성 중...' : '스팟 생성하기'}
        </button>
      </div>
    </div>
  );
}
