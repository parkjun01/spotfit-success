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
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 32 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32' }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#c9f236', flex: 1, letterSpacing: '0.05em' }}>알림 설정</h1>
        {saved && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>저장됨 ✓</span>}
      </header>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#e5e2e3' }}>전체 알림</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A', marginTop: 2 }}>모든 알림을 한번에 켜거나 끕니다</p>
          </div>
          <Toggle on={allOn} onToggle={toggleAll} />
        </div>

        {SETTING_GROUPS.map(group => (
          <div key={group.title} style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #1E1E22' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A9A' }}>{group.title}</p>
            </div>
            {group.items.map((item, i) => (
              <div key={item.key} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < group.items.length - 1 ? '1px solid #1E1E22' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 500, color: '#e5e2e3' }}>{item.label}</p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A', marginTop: 2 }}>{item.desc}</p>
                </div>
                <Toggle on={settings[item.key as keyof NotifSettings]} onToggle={() => toggle(item.key as keyof NotifSettings)} />
              </div>
            ))}
          </div>
        ))}
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, textAlign: 'center', color: '#3E3E4A', paddingTop: 8 }}>알림은 기기 설정에서도 별도로 허용해야 수신됩니다</p>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} style={{ position: 'relative', width: 48, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', background: on ? '#c9f236' : '#2a2a2b', transition: 'background 0.2s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 'calc(100% - 22px)' : 2, width: 20, height: 20, borderRadius: '50%', background: on ? '#171e00' : '#8A8A9A', transition: 'left 0.2s', display: 'block' }} />
    </button>
  );
}
