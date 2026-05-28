'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Sport { id: string; name: string; }

export default function EditProfilePage() {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nickname: '',
    activityRegion: '',
    preferredSports: [] as string[],
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }

    Promise.all([
      fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/sports').then(r => r.json()),
    ]).then(([userData, sportsData]) => {
      const user = userData.data;
      setSports(sportsData.data || []);
      setForm({
        nickname: user?.nickname || '',
        activityRegion: user?.activity_region || '',
        preferredSports: user?.user_sports?.map((us: any) => us.sports?.id).filter(Boolean) || [],
      });
    }).finally(() => setLoading(false));
  }, []);

  const toggleSport = (id: string) => {
    setForm(f => ({
      ...f,
      preferredSports: f.preferredSports.includes(id)
        ? f.preferredSports.filter(s => s !== id)
        : [...f.preferredSports, id],
    }));
  };

  const handleSave = async () => {
    if (!form.nickname.trim()) return setError('닉네임을 입력해주세요');
    if (form.nickname.length < 2 || form.nickname.length > 20) return setError('닉네임은 2~20자여야 합니다');
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nickname: form.nickname.trim(),
          activityRegion: form.activityRegion.trim() || undefined,
          preferredSports: form.preferredSports,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || '저장 실패');

      // Update stored user object
      for (const storage of [localStorage, sessionStorage]) {
        const stored = storage.getItem('user');
        if (stored) {
          storage.setItem('user', JSON.stringify({ ...JSON.parse(stored), nickname: form.nickname.trim() }));
        }
      }
      router.push('/mypage');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-lg font-bold text-gray-900">프로필 수정</h1>
      </header>

      <div className="p-4 space-y-4 pb-32">
        <div className="card space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">닉네임</label>
            <input
              className="input w-full"
              value={form.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              maxLength={20}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">활동 지역</label>
            <input
              className="input w-full"
              placeholder="예: 서울 강남구"
              value={form.activityRegion}
              onChange={e => setForm(f => ({ ...f, activityRegion: e.target.value }))}
            />
          </div>
        </div>

        <div className="card space-y-3">
          <p className="text-sm font-bold text-gray-800">선호 종목</p>
          <div className="grid grid-cols-3 gap-2">
            {sports.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSport(s.id)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                  form.preferredSports.includes(s.id)
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-4 py-4">
        <button className="btn-primary w-full" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
