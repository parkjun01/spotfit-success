'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

declare global { interface Window { daum: any; } }

interface Sport { id: string; name: string; }
interface Tag { id: string; name: string; classification: string; }
interface PlaceResult { place_name: string; address_name: string; road_address_name: string; x: string; y: string; }

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
    avgSpeed: '',
    avgPaceMin: '',
    avgPaceSec: '',
  });

  const [hostNickname, setHostNickname] = useState('');
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [noShowPrevention, setNoShowPrevention] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [selectedPlaceName, setSelectedPlaceName] = useState('');

  const GPX_SPORTS = ['러닝', '등산', '자전거', '클라이밍', '걷기'];
  const SPEED_SPORTS = ['자전거'];
  const PACE_SPORTS = ['등산', '러닝'];
  const selectedSportName = sports.find(s => s.id === form.sportId)?.name || '';
  const showSpeedInput = SPEED_SPORTS.includes(selectedSportName);
  const showPaceInput = PACE_SPORTS.includes(selectedSportName);

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    setHostNickname(user.nickname || '');
    fetch('/api/sports').then(r => r.json()).then(d => setSports(d.data || []));
    fetch('/api/tags').then(r => r.json()).then(d => setTags(d.data || []));
  }, []);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const invalid = (cond: boolean) =>
    showErrors && cond ? '!border-red-500' : '';

  const useCurrentLocation = async () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        set('latitude', String(lat));
        set('longitude', String(lng));
        setSelectedPlaceName('');
        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (data.data?.name) set('locationName', data.data.name);
        } catch { /* 역지오코딩 실패 시 좌표만 유지 */ }
        setLocating(false);
      },
      () => { setError('위치 권한을 허용해주세요'); setLocating(false); }
    );
  };

  const handleAddressSelect = (result: { address: string; sido: string; sigungu: string; buildingName?: string }) => {
    const displayName = result.buildingName?.trim() || result.address;
    set('locationName', displayName);
    set('latitude', '');
    setSelectedPlaceName('');
    set('longitude', '');

    // layout.tsx에서 autoload=false로 SDK를 로드하므로
    // kakao.maps.load()를 호출해야 services(Geocoder)가 초기화됨
    const doGeocode = (kakao: any) => {
      if (kakao.maps?.services) {
        runGeocoder(kakao);
      } else if (typeof kakao.maps?.load === 'function') {
        kakao.maps.load(() => runGeocoder(kakao));
      } else {
        setError('주소 좌표 변환 실패. 현재 위치 버튼을 사용해주세요.');
      }
    };

    const tryKakaoGeocoder = () => {
      const kakao = (window as any).kakao;
      if (!kakao) {
        let attempts = 0;
        const wait = setInterval(() => {
          attempts++;
          const k = (window as any).kakao;
          if (k) { clearInterval(wait); doGeocode(k); }
          else if (attempts >= 50) { clearInterval(wait); setError('카카오 SDK 로드 실패. 현재 위치 버튼을 사용해주세요.'); }
        }, 100);
        return;
      }
      doGeocode(kakao);
    };

    const runGeocoder = (kakao: any) => {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(result.address, (res: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK && res.length > 0) {
          set('latitude', res[0].y);
          set('longitude', res[0].x);
        } else {
          setError('주소 좌표를 찾지 못했습니다. 현재 위치 버튼을 사용해주세요.');
        }
      });
    };

    tryKakaoGeocoder();
  };

  const withKakaoServices = (cb: (kakao: any) => void) => {
    const kakao = (window as any).kakao;
    if (!kakao) { setError('카카오 SDK가 로드되지 않았습니다'); return; }
    if (kakao.maps?.services) { cb(kakao); }
    else if (typeof kakao.maps?.load === 'function') { kakao.maps.load(() => cb(kakao)); }
    else { setError('장소 검색 서비스를 초기화할 수 없습니다'); }
  };

  const handlePlaceSearch = () => {
    if (!placeQuery.trim()) return;
    setPlaceSearching(true);
    setShowPlaceResults(false);
    withKakaoServices(kakao => {
      const ps = new kakao.maps.services.Places();
      ps.keywordSearch(placeQuery.trim(), (results: PlaceResult[], status: string) => {
        setPlaceSearching(false);
        if (status === kakao.maps.services.Status.OK) {
          setPlaceResults(results.slice(0, 6));
          setShowPlaceResults(true);
        } else {
          setPlaceResults([]);
          setError('검색 결과가 없습니다. 다른 검색어를 시도해보세요.');
        }
      });
    });
  };

  const handleSelectPlace = (place: PlaceResult) => {
    const roadAddress = place.road_address_name || place.address_name;
    set('locationName', roadAddress || place.place_name);
    set('latitude', place.y);
    set('longitude', place.x);
    setPlaceQuery(place.place_name);
    setSelectedPlaceName(place.place_name);
    setShowPlaceResults(false);
    setError('');
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
          avgSpeed: showSpeedInput && form.avgSpeed ? parseFloat(form.avgSpeed) : null,
          avgPace: showPaceInput && form.avgPaceMin
            ? `${form.avgPaceMin}:${(form.avgPaceSec || '0').padStart(2, '0')}`
            : null,
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
    <div style={{ minHeight: '100vh', background: '#131314' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#c9f236', letterSpacing: '0.05em' }}>스팟 생성</h1>
      </header>

      <div className="p-4 space-y-4 pb-32">

        {/* 팀장 표시 */}
        <div className="card">
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', marginBottom: 8 }}>HOST</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#c9f236', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: 16, color: '#171e00' }}>
              {hostNickname?.[0] || '?'}
            </div>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#e5e2e3' }}>{hostNickname || '로딩 중...'}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, color: '#c9f236', textTransform: 'uppercase' }}>(나)</span>
          </div>
        </div>

        {/* 종목 */}
        <div className={`card space-y-3 ${showErrors && !form.sportId ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>종목 <span className="text-red-400">*</span></p>
            {showErrors && !form.sportId && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444' }}>종목을 선택해주세요</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {sports.map(s => (
              <button
                key={s.id}
                onClick={() => set('sportId', s.id)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  form.sportId === s.id
                    ? 'bg-primary text-primary-on border-primary'
                    : 'bg-elevated text-text-secondary border-border-dark hover:border-primary'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="card space-y-3">
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>기본 정보</p>
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>
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
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>설명 (선택)</label>
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
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>난이도</label>
            <div className="flex gap-2">
              {[['beginner', '초급'], ['intermediate', '중급'], ['advanced', '고급']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => set('difficultyLevel', val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.difficultyLevel === val
                      ? 'bg-primary text-white border-primary'
                      : 'bg-elevated text-text-secondary border-border-dark'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 평균 속도 (자전거) */}
        {showSpeedInput && (
          <div className="card space-y-3">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>
              🚴 평균 속도 <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A', fontWeight: 400, textTransform: 'none' }}>(선택사항)</span>
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>참여자들이 페이스를 맞출 수 있도록 예상 평균 속도를 알려주세요.</p>
            <div className="relative">
              <input
                className="input w-full pr-16"
                type="number"
                placeholder="예: 25"
                min={1}
                max={100}
                value={form.avgSpeed}
                onChange={e => set('avgSpeed', e.target.value)}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: '#c9f236', pointerEvents: 'none' }}>km/h</span>
            </div>
            {form.avgSpeed && (
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#c9f236', fontWeight: 600 }}>
                ✓ 평균 {form.avgSpeed} km/h 페이스로 진행
              </p>
            )}
          </div>
        )}

        {/* 평균 페이스 (등산 / 러닝) */}
        {showPaceInput && (
          <div className="card space-y-3">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>
              {selectedSportName === '등산' ? '🏔️' : '🏃'} 평균 페이스 <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A', fontWeight: 400, textTransform: 'none' }}>(선택사항)</span>
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>
              {selectedSportName === '등산'
                ? '참여자들이 체력에 맞게 준비할 수 있도록 예상 페이스를 알려주세요.'
                : '참여자들이 속도를 맞출 수 있도록 예상 평균 페이스를 알려주세요.'}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  className="input w-full pr-10"
                  type="number"
                  placeholder="5"
                  min={1}
                  max={59}
                  value={form.avgPaceMin}
                  onChange={e => set('avgPaceMin', e.target.value)}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#8A8A9A', pointerEvents: 'none' }}>분</span>
              </div>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#e5e2e3' }}>:</span>
              <div className="flex-1 relative">
                <input
                  className="input w-full pr-10"
                  type="number"
                  placeholder="30"
                  min={0}
                  max={59}
                  value={form.avgPaceSec}
                  onChange={e => set('avgPaceSec', e.target.value)}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#8A8A9A', pointerEvents: 'none' }}>초</span>
              </div>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: '#c9f236', whiteSpace: 'nowrap' }}>/km</span>
            </div>
            {form.avgPaceMin && (
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#c9f236', fontWeight: 600 }}>
                ✓ 평균 {form.avgPaceMin}:{(form.avgPaceSec || '0').padStart(2, '0')} /km 페이스로 진행
              </p>
            )}
          </div>
        )}

        {/* 인원 */}
        <div className="card space-y-3">
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>인원수 <span className="text-red-400">*</span></p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => set('maxParticipants', String(Math.max(2, parseInt(form.maxParticipants) - 1)))}
              style={{ width: 40, height: 40, borderRadius: '50%', background: '#1E1E22', color: '#e5e2e3', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2A2A32', cursor: 'pointer' }}
            >
              −
            </button>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', width: 64, textAlign: 'center' }}>
              {form.maxParticipants}명
            </span>
            <button
              onClick={() => set('maxParticipants', String(Math.min(50, parseInt(form.maxParticipants) + 1)))}
              style={{ width: 40, height: 40, borderRadius: '50%', background: '#1E1E22', color: '#e5e2e3', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2A2A32', cursor: 'pointer' }}
            >
              +
            </button>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>최소 2명 · 최대 50명 (본인 포함)</p>
        </div>

        {/* 날짜 & 시간 */}
        <div className={`card space-y-3 ${showErrors && (!form.date || !form.time) ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>날짜 & 시간 <span className="text-red-400">*</span></p>
            {showErrors && (!form.date || !form.time) && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444' }}>날짜와 시간을 선택해주세요</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>날짜</label>
              <input
                className={`input w-full ${invalid(!form.date)}`}
                type="date"
                value={form.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>시간</label>
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
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>장소 <span className="text-red-400">*</span></p>
            {showErrors && !form.locationName.trim() && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444' }}>장소를 입력해주세요</span>
            )}
            {showErrors && form.locationName.trim() && !form.latitude && (
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444' }}>좌표 설정 필요</span>
            )}
          </div>

          {/* 장소명 키워드 검색 (메인) */}
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>장소 검색</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input flex-1"
                placeholder="예: 충북대학교, 올림픽공원, 잠실종합운동장"
                value={placeQuery}
                onChange={e => { setPlaceQuery(e.target.value); setShowPlaceResults(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePlaceSearch(); } }}
              />
              <button
                type="button"
                onClick={handlePlaceSearch}
                disabled={placeSearching}
                style={{ padding: '0 14px', borderRadius: 10, border: '1px solid #c9f236', color: '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, background: 'rgba(201,242,54,0.08)', cursor: placeSearching ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: placeSearching ? 0.6 : 1, flexShrink: 0 }}
              >
                {placeSearching ? '검색 중...' : '🔍 검색'}
              </button>
            </div>

            {/* 검색 결과 목록 */}
            {showPlaceResults && placeResults.length > 0 && (
              <div style={{ marginTop: 6, borderRadius: 12, border: '1px solid #2A2A32', overflow: 'hidden', background: '#1A1A1E' }}>
                {placeResults.map((place, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    style={{ width: '100%', display: 'block', textAlign: 'left', padding: '10px 14px', borderBottom: i < placeResults.length - 1 ? '1px solid #2A2A32' : 'none', background: 'transparent', cursor: 'pointer', border: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#22222A')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#e5e2e3', marginBottom: 2 }}>{place.place_name}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>{place.road_address_name || place.address_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: '#2A2A32' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#4A4A5A' }}>또는</span>
            <div style={{ flex: 1, height: 1, background: '#2A2A32' }} />
          </div>

          {/* 도로명 주소 검색 + 현재 위치 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const openPostcode = () => {
                  new window.daum.Postcode({
                    oncomplete: (data: any) => handleAddressSelect({ address: data.roadAddress || data.jibunAddress, sido: data.sido, sigungu: data.sigungu, buildingName: data.buildingName }),
                    theme: { bgColor: '#F97316', searchBgColor: '#F97316', queryTextColor: '#FFFFFF' },
                  }).open();
                };
                if (window.daum?.Postcode) {
                  openPostcode();
                } else {
                  const s = document.createElement('script');
                  s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
                  s.onload = openPostcode;
                  document.head.appendChild(s);
                }
              }}
              style={{ padding: '10px 0', borderRadius: 10, border: '1px solid #2A2A32', color: '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', background: '#1E1E22', cursor: 'pointer' }}
            >
              📮 도로명 주소
            </button>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              style={{ padding: '10px 0', borderRadius: 10, border: '1px solid #2A2A32', color: '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', background: '#1E1E22', cursor: 'pointer', opacity: locating ? 0.5 : 1 }}
            >
              {locating ? '변환 중...' : '📍 현재 위치'}
            </button>
          </div>

          {/* 선택된 장소 요약 카드 (키워드 검색으로 선택 시) */}
          {selectedPlaceName && form.latitude && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'rgba(201,242,54,0.06)', borderRadius: 12, border: '1px solid rgba(201,242,54,0.25)' }}>
              <span style={{ fontSize: 18, marginTop: 1 }}>📍</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#c9f236', marginBottom: 2 }}>{selectedPlaceName}</p>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A', wordBreak: 'break-all' }}>{form.locationName}</p>
              </div>
            </div>
          )}

          {/* 도로명 주소 */}
          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>
              도로명 주소 <span className="text-red-400">*</span>
            </label>
            <input
              className={`input w-full ${invalid(!form.locationName.trim())}`}
              placeholder="위에서 장소를 검색하거나 직접 입력하세요"
              value={form.locationName}
              onChange={e => { set('locationName', e.target.value); setSelectedPlaceName(''); }}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>상세 장소명 (선택)</label>
            <input
              className="input w-full"
              placeholder="예: 3층 풋살장, B동 입구 등"
              value={form.locationDetail}
              onChange={e => set('locationDetail', e.target.value)}
            />
          </div>

          {form.latitude && form.longitude ? (
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#22C55E', fontWeight: 700 }}>
              ✓ 위치 설정됨 ({parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)})
            </p>
          ) : showErrors && form.locationName.trim() ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444' }}>
              ⚠ 좌표가 없습니다. 장소 검색 또는 현재 위치 버튼을 눌러주세요
            </p>
          ) : null}
        </div>

        {/* 나이 제한 */}
        <div className={`card space-y-3 ${ageError ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between">
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>나이 제한</p>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>선택사항</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>최소 나이</label>
              <div className="relative">
                <input
                  className={`input w-full pr-8 ${ageError ? '!border-red-500' : ''}`}
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
              <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>최대 나이</label>
              <div className="relative">
                <input
                  className={`input w-full pr-8 ${ageError ? '!border-red-500' : ''}`}
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
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#EF4444' }}>최소 나이가 최대 나이보다 클 수 없습니다</p>
          ) : (form.minAge || form.maxAge) ? (
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#c9f236', fontWeight: 600 }}>
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
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>태그</p>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>선택사항 · 최대 5개</span>
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
                      : 'bg-elevated text-text-secondary border-border-dark hover:border-primary'
                  }`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GPX 경로 업로드 (러닝/등산/자전거 등) */}
        {GPX_SPORTS.includes(selectedSportName) && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>📍 GPX 경로 파일 <span className="text-gray-400 font-normal text-xs">(선택사항)</span></p>
            </div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>러닝/등산 코스를 GPX 파일로 공유하면 참여자들이 경로를 미리 확인할 수 있어요.</p>
            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              gpxFile ? 'border-primary' : 'border-border-dark hover:border-primary'
            }`}>
              <span className="text-2xl">{gpxFile ? '✅' : '📂'}</span>
              <div className="flex-1 min-w-0">
                {gpxFile ? (
                  <>
                    <p className="text-sm font-bold text-primary truncate">{gpxFile.name}</p>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>{(gpxFile.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">GPX 파일 선택 (.gpx)</p>
                )}
              </div>
              {gpxFile && (
                <button type="button" onClick={e => { e.preventDefault(); setGpxFile(null); }} className="text-gray-400 text-sm">✕</button>
              )}
              <input type="file" accept=".gpx" className="hidden" onChange={e => setGpxFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        )}

        {/* 노쇼 방지 */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3', textTransform: 'uppercase' as const }}>🚫 노쇼 방지</p>
              <p className="text-xs text-gray-400 mt-0.5">참여자가 무단 불참 시 매너점수 차감</p>
            </div>
            <button
              type="button"
              onClick={() => setNoShowPrevention(v => !v)}
              style={{ position: 'relative', width: 48, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', background: noShowPrevention ? '#c9f236' : '#2a2a2b', transition: 'background 0.2s' }}
            >
              <span style={{ position: 'absolute', top: 2, left: noShowPrevention ? 'calc(100% - 22px)' : 2, width: 20, height: 20, borderRadius: '50%', background: noShowPrevention ? '#171e00' : '#8A8A9A', transition: 'left 0.2s', display: 'block' }} />
            </button>
          </div>
          {noShowPrevention && (
            <div style={{ marginTop: 12, background: 'rgba(253,89,30,0.08)', border: '1px solid rgba(253,89,30,0.25)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#fd591e' }}>✓ 노쇼 방지 활성화 시 참여자가 24시간 전 취소하지 않으면 매너점수 -2점이 부과됩니다.</p>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#EF4444', fontWeight: 500 }}>⚠ {error}</p>
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 448, background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2A2A32', padding: '12px 16px 20px', zIndex: 50 }}>
        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', height: 52, background: loading ? '#2a2a2b' : '#c9f236', color: loading ? '#8A8A9A' : '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', borderRadius: 12, cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s' }}>
          {loading ? '생성 중...' : '스팟 생성하기'}
        </button>
      </div>
    </div>
  );
}
