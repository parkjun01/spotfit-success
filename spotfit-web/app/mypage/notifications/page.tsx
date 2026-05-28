'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NotifSettings {
  spot_invite: boolean;
  spot_join: boolean;
  spot_start: boolean;
  spot_cancel: boolean;
  chat_message: boolean;
  evaluation_request: boolean;
  manner_score_change: boolean;
  marketing: boolean;
}

const DEFAULT_SETTINGS: NotifSettings = {
  spot_invite: true,
  spot_join: true,
  spot_start: true,
  spot_cancel: true,
  chat_message: true,
  evaluation_request: true,
  manner_score_change: true,
  marketing: false,
};

const SETTING_GROUPS = [
  {
    title: '스팟 알림',
    items: [
      { key: 'spot_invite', label: '스팟 초대', desc: '누군가 나를 스팟에 초대했을 때' },
      { key: 'spot_join', label: '참여자 알림', desc: '내 스팟에 새 참여자가 생겼을 때' },
      { key: 'spot_start', label: '스팟 시작 알림', desc: '참여한 스팟이 1시간 전일 때' },
      { key: 'spot_cancel', label: '스팟 취소 알림', desc: '참여한 스팟이 취소됐을 때' },
    ],
  },
  {
    title: '채팅 알림',
    items: [
      { key: 'chat_message', label: '채팅 메시지', desc: '채팅방에 새 메시지가 왔을 때' },
    ],
  },
  {
    title: '매너 & 평가 알림',
    items: [
      { key: 'evaluation_request', label: '평가 요청', desc: '스팟 종료 후 평가 요청이 왔을 때' },
      { key: 'manner_score_change', label: '매너점수 변동', desc: '내 매너점수가 변경됐을 때' },
    ],
  },
  {
    title: '마케팅 알림',
    items: [
      { key: 'marketing', label: '이벤트 및 혜택', desc: '프로모션, 신규 혜택 소식' },
    ],
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('notif_settings');
      if (stored) setSettings(JSON.parse(stored));
    } catch {}
  }, []);

  const toggle = (key: keyof NotifSettings) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('notif_settings', JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const allOn = Object.values(settings).every(Boolean);
  const toggleAll = () => {
    const next = Object.fromEntries(
      Object.keys(settings).map(k => [k, !allOn])
    ) as unknown as NotifSettings;
    setSettings(next);
    localStorage.setItem('notif_settings', JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-extrabold text-gray-900 flex-1">알림 설정</h1>
        {saved && <span className="text-xs text-emerald-500 font-semibold animate-pulse">저장됨 ✓</span>}
      </header>

      <div className="p-4 space-y-3">

        {/* 전체 토글 */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="font-extrabold text-gray-900 text-sm">전체 알림</p>
            <p className="text-xs text-gray-400 mt-0.5">모든 알림을 한번에 켜거나 끕니다</p>
          </div>
          <Toggle on={allOn} onToggle={toggleAll} />
        </div>

        {/* 그룹별 설정 */}
        {SETTING_GROUPS.map(group => (
          <div key={group.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50">
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wide">{group.title}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {group.items.map(item => (
                <div key={item.key} className="px-4 py-3.5 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle
                    on={settings[item.key as keyof NotifSettings]}
                    onToggle={() => toggle(item.key as keyof NotifSettings)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-xs text-center text-gray-300 pt-2">
          알림은 기기 설정에서도 별도로 허용해야 수신됩니다
        </p>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}
