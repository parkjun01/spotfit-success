'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

declare global { interface Window { daum: any; } }

interface Sport { id: string; name: string; }
interface Tag { id: string; name: string; classification: string; }

export default function NewSpotPage() {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

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
    locationDetail: '',
  });

  const [hostNickname, setHostNickname] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    setHostNickname(user.nickname || '');
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
    fetch('/api/tags').then(r => r.json()).then(d => setTags(d.data || []));
  }, []);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  // 빨간 테두리 클래스 헬퍼
  const invalid = (cond: boolean) =>
    showErrors && cond
      ? '!border-red-400 !bg-red-50 focus:!ring-red-200 focus:!border-red-400'
      : '';

  const useCurrentLocation = async () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        set('latitude', String(lat));
        set('longitude', String(lng));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'ko' } }
          );
          const data = await res.json();
          if (data?.display_name) {
            const parts = data.address;
            const addr = [
              parts?.city || parts?.province || parts?.state,
              parts?.city_district || parts?.county || parts?.borough,
              parts?.suburb || parts?.neighbourhood || parts?.quarter,
              parts?.road,
            ].filter(Boolean).join(' ');
            set('locationName', addr || data.display_name.split(',').slice(0, 3).join(',').trim());
          }
        } catch { /* 역지오코딩 실패 시 좌표만 유지 */ }
        setLocating(false);
      },
      () => {
        setError('위치 권한을 허용해주세요');
        setLocating(false);
      }
    );
  };

  const handleAddressSelect = async (result: { address: string; sido: string; sigungu: string }) => {
    set('locationName', result.address);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(result.address)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'ko' } }
      );
      const data = await res.json();
      if (data[0]) {
        set('latitude', data[0].lat);
        set('longitude', data[0].lon);
      }
    } catch { /* 좌표 조회 실패 */ }
  };

  const handleSubmit = async () => {
    setShowErrors(true);

    if (!form.sportId) return setError('종목을 선택해주세요');
    if (!form.title.trim()) return setError('제목을 입력해주세요');
    if (!form.locationName.trim()) return setError('장소명을 입력해주세요');
    if (!form.latitude || !form.longitude) return setError('위치를 설정해주세요 (주소 검색 또는 현재 위치 버튼 사용)');
    if (!form.date || !form.time) return setError('날짜와 시간을 선택해주세요');
    if (form.minAge && form.maxAge && Number(form.minAge) > Number(form.maxAge)) {
      return setError('최소 나이가 최대 나이보다 클 수 없습니다');
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch('/api/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sportId: form.sportId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          locationName: form.locationDetail.trim()
            ? `${form.locationName.trim()} ${form.locationDetail.trim()}`
            : form.locationName.trim(),
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          maxParticipants: parseInt(form.maxParticipants),
          difficultyLevel: form.difficultyLevel,
          startsAt: `${form.date}T${form.time}:00`,
          minAge: form.minAge ? parseInt(form.minAge) : null,
          maxAge: form.maxAge ? parseInt(form.maxAge) : null,
          tagIds: selectedTagIds,
        }),
      });
      const data = await res.json();
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) return setError(data.message || '오류가 발생했습니다');
      router.push(`/spots/${data.data.spotId}`);
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const ageError = showErrors && form.minAge && form.maxAge && Number(form.minAge) > Number(form.maxAge);

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className={`card space-y-3 ${showErrors && !form.sportId ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">종목 <span className="text-red-400">*</span></p>
            {showErrors && !form.sportId && (
              <span className="text-xs text-red-500 font-medium">종목을 선택해주세요</span>
            )}
          </div>
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
              className={`input w-full ${invalid(!form.title.trim())}`}
              placeholder="예: 강남 풋살 같이해요"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              maxLength={50}
            />
            {showErrors && !form.title.trim() && (
              <p className="text-xs text-red-500 mt-1">제목을 입력해주세요</p>
            )}
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
        <div className={`card space-y-3 ${showErrors && (!form.date || !form.time) ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">날짜 & 시간 <span className="text-red-400">*</span></p>
            {showErrors && (!form.date || !form.time) && (
              <span className="text-xs text-red-500 font-medium">날짜와 시간을 선택해주세요</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">날짜</label>
              <input
                className={`input w-full ${invalid(!form.date)}`}
                type="date"
                value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">시간</label>
              <input
                className={`input w-full ${invalid(!form.time)}`}
                type="time"
                value={form.time}
                onChange={e => set('time', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 장소 */}
        <div className={`card space-y-3 ${showErrors && (!form.locationName.trim() || !form.latitude) ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">장소 <span className="text-red-400">*</span></p>
            {showErrors && !form.locationName.trim() && (
              <span className="text-xs text-red-500 font-medium">장소를 입력해주세요</span>
            )}
            {showErrors && form.locationName.trim() && !form.latitude && (
              <span className="text-xs text-red-500 font-medium">좌표 설정 필요</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.daum?.Postcode) {
                  new window.daum.Postcode({
                    oncomplete: (data: any) => handleAddressSelect({ address: data.roadAddress || data.jibunAddress, sido: data.sido, sigungu: data.sigungu }),
                    theme: { bgColor: '#4F46E5', searchBgColor: '#4F46E5', queryTextColor: '#FFFFFF' },
                  }).open();
                }
              }}
              className="py-2.5 rounded-xl border-2 border-primary text-primary text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              🔍 주소 검색
            </button>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {locating ? '변환 중...' : '📍 현재 위치'}
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              장소 주소 <span className="text-red-400">*</span>
            </label>
            <input
              className={`input w-full ${invalid(!form.locationName.trim())}`}
              placeholder="주소 검색 또는 현재 위치 버튼 사용"
              value={form.locationName}
              onChange={e => set('locationName', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">상세 장소명 (선택)</label>
            <input
              className="input w-full"
              placeholder="예: 3층 풋살장, B동 입구 등"
              value={form.locationDetail}
              onChange={e => set('locationDetail', e.target.value)}
            />
          </div>

          {form.latitude && form.longitude ? (
            <p className="text-xs text-emerald-600 font-medium">
              ✓ 위치 설정됨 ({parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)})
            </p>
          ) : showErrors && form.locationName.trim() ? (
            <p className="text-xs text-red-500 font-medium">
              ⚠ 좌표가 없습니다. 주소 검색 또는 현재 위치 버튼을 눌러주세요
            </p>
          ) : null}
        </div>

        {/* 나이 제한 */}
        <div className={`card space-y-3 ${ageError ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">나이 제한</p>
            <span className="text-xs text-gray-400">선택사항</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">최소 나이</label>
              <div className="relative">
                <input
                  className={`input w-full pr-8 ${ageError ? '!border-red-400 !bg-red-50' : ''}`}
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
                  className={`input w-full pr-8 ${ageError ? '!border-red-400 !bg-red-50' : ''}`}
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
          {ageError ? (
            <p className="text-xs text-red-500 font-medium">최소 나이가 최대 나이보다 클 수 없습니다</p>
          ) : (form.minAge || form.maxAge) ? (
            <p className="text-xs text-indigo-600">
              {form.minAge && form.maxAge
                ? `${form.minAge}세 ~ ${form.maxAge}세만 참여 가능`
                : form.minAge
                ? `${form.minAge}세 이상만 참여 가능`
                : `${form.maxAge}세 이하만 참여 가능`}
            </p>
          ) : null}
        </div>

        {/* 태그 */}
        {tags.length > 0 && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-800">태그</p>
              <span className="text-xs text-gray-400">선택사항 · 최대 5개</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    setSelectedTagIds(prev =>
                      prev.includes(tag.id)
                        ? prev.filter(t => t !== tag.id)
                        : prev.length < 5 ? [...prev, tag.id] : prev
                    );
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm font-medium">⚠ {error}</p>
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
