'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Message {
  id: string;
  user_id: string;
  message: string;
  message_type: string;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

interface Participant {
  user_id: string;
  status: string;
  users: { nickname: string; manner_score: number };
}

const STATUS_OPTIONS = [
  { value: 'ready', label: '🟡 준비 중' },
  { value: 'in_progress', label: '🟢 운동 중' },
  { value: 'completed', label: '✅ 완료' },
];

export default function SpotChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [input, setInput] = useState('');
  const [myStatus, setMyStatus] = useState('ready');
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [spotTitle, setSpotTitle] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const seenIds = useRef(new Set<string>());
  const lastCreatedAt = useRef('');

  useEffect(() => {
    try {
      const t = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (!t) { router.push('/login'); return; }
      setToken(t);

      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUserId(u.id || null);
        setNickname(u.nickname || '');
      }

      fetch(`/api/spots/${id}`)
        .then(r => r.json())
        .then(d => {
          setSpotTitle(d.data?.title || '채팅방');
          const parts: Participant[] = (d.data?.participations || []).filter(
            (p: any) => p.status === 'joined' || p.status === null
          );
          setParticipants(parts);
        })
        .catch(() => {});

      fetch(`/api/spots/${id}/messages?limit=50`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(d => {
          const msgs: Message[] = d.data || [];
          msgs.forEach(m => seenIds.current.add(m.id));
          setMessages(msgs);
          if (msgs.length) lastCreatedAt.current = msgs[msgs.length - 1].created_at;
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch (e: any) {
      setPageError(e?.message || '초기화 오류');
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (userId && participants.length > 0) {
      setIsParticipant(participants.some(p => p.user_id === userId));
    }
  }, [userId, participants]);

  // Supabase Realtime — 동적 import로 안전하게
  useEffect(() => {
    if (!id) return;
    let channel: any = null;

    import('@/lib/supabase').then(({ supabase }) => {
      try {
        channel = supabase
          .channel(`chat:${id}`, { config: { broadcast: { ack: false } } })
          .on('broadcast', { event: 'new_message' }, ({ payload }: { payload: Message }) => {
            if (!seenIds.current.has(payload.id)) {
              seenIds.current.add(payload.id);
              setMessages(prev => [...prev, payload]);
              lastCreatedAt.current = payload.created_at;
            }
          })
          .subscribe((status: string) => {
            setConnected(status === 'SUBSCRIBED');
          });
        channelRef.current = channel;
      } catch (e) {
        console.error('Realtime 연결 실패:', e);
      }
    }).catch(e => console.error('Supabase import 실패:', e));

    return () => {
      if (channel) {
        import('@/lib/supabase').then(({ supabase }) => {
          supabase.removeChannel(channel);
        }).catch(() => {});
      }
    };
  }, [id]);

  // 폴링 (3초마다 — 항상 최근 100개를 가져와 새 메시지만 추가)
  useEffect(() => {
    if (!token || loading) return;
    const poll = () => {
      fetch(`/api/spots/${id}/messages?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          const all: Message[] = d.data || [];
          const fresh = all.filter(m => !seenIds.current.has(m.id));
          if (fresh.length) {
            fresh.forEach(m => seenIds.current.add(m.id));
            setMessages(prev => {
              const merged = [...prev, ...fresh];
              merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              return merged;
            });
          }
        })
        .catch(() => {});
    };
    const timer = setInterval(poll, 3_000);
    return () => clearInterval(timer);
  }, [id, token, loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (type: 'text' | 'status' = 'text', content?: string) => {
    const msg = content || input.trim();
    if (!msg || !token || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(`/api/spots/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg, message_type: type }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const saved: Message = data.data;
        if (!seenIds.current.has(saved.id)) {
          seenIds.current.add(saved.id);
          setMessages(prev => [...prev, saved]);
          lastCreatedAt.current = saved.created_at;
        }
        channelRef.current?.send({
          type: 'broadcast',
          event: 'new_message',
          payload: saved,
        });
      } else if (data.message) {
        alert(data.message);
      }
    } catch {
      alert('메시지 전송 실패');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setMyStatus(status);
    const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    const displayName = nickname.endsWith('님') ? nickname : `${nickname}님`;
    await sendMessage('status', `${displayName} 상태: ${label}`);
  };

  const isMe = (msg: Message) => {
    if (userId) return msg.user_id === userId;
    // userId 로드 전 fallback: 닉네임 비교
    return msg.users?.nickname === nickname;
  };
  const mannerColor = (s: number) =>
    s >= 38 ? 'text-emerald-600' : s >= 30 ? 'text-amber-500' : 'text-red-500';

  const safeFormat = (dateStr: string) => {
    try { return format(new Date(dateStr), 'HH:mm'); } catch { return ''; }
  };

  // 유저별 고정 색상 (닉네임 기반)
  const AVATAR_COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#0D9488','#6366F1'];
  const avatarColor = (uid: string) => AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length];

  if (pageError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, background: '#131314' }}>
        <p style={{ fontSize: 40 }}>⚠️</p>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#e5e2e3', textAlign: 'center' }}>채팅을 불러올 수 없어요</p>
        <p style={{ fontSize: 13, color: '#8A8A9A', textAlign: 'center' }}>{pageError}</p>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', background: '#c9f236', color: '#171e00', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>돌아가기</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0A0A0B' }}>

      {/* Header */}
      <header style={{ background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#ffffef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spotTitle || '채팅방'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22C55E' : '#3E3E4A' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>{connected ? `실시간 · ${participants.length}명` : '연결 중...'}</span>
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          {participants.slice(0, 4).map(p => (
            <div key={p.user_id} title={p.users?.nickname} style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(p.user_id), border: '2px solid #0A0A0B', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {p.users?.nickname?.[0] || '?'}
            </div>
          ))}
          {participants.length > 4 && (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a2a2b', border: '2px solid #0A0A0B', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A' }}>+{participants.length - 4}</div>
          )}
        </div>
      </header>

      {/* Status Bar */}
      {isParticipant && (
        <div style={{ background: '#141416', borderBottom: '1px solid #2A2A32', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', flexShrink: 0 }} className="no-scrollbar">
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', flexShrink: 0 }}>내 상태</span>
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => handleStatusChange(s.value)} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${myStatus === s.value ? '#c9f236' : '#2A2A32'}`, background: myStatus === s.value ? 'rgba(201,242,54,0.1)' : '#1E1E22', color: myStatus === s.value ? '#c9f236' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s' }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}>
            <div style={{ width: 24, height: 24, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 64 }}>
            <p style={{ fontSize: 32 }}>💬</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8A8A9A', marginTop: 8 }}>아직 메시지가 없습니다.<br/>첫 번째로 인사해보세요!</p>
          </div>
        )}
        {messages.map((msg, idx) => {
          if (msg.message_type === 'status' || msg.message_type === 'notice') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                <span style={{ background: 'rgba(255,255,255,0.06)', color: '#8A8A9A', fontSize: 12, padding: '4px 14px', borderRadius: 999 }}>{msg.message}</span>
              </div>
            );
          }
          const mine = isMe(msg);
          const prev = messages[idx - 1];
          const showHeader = !mine && (!prev || prev.message_type === 'status' || prev.message_type === 'notice' || prev.user_id !== msg.user_id);
          const color = avatarColor(msg.user_id);
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: mine ? 'row-reverse' : 'row', marginTop: showHeader ? 12 : 2 }}>
              {!mine && (
                <div style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  {showHeader && (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      {msg.users?.nickname?.[0] || '?'}
                    </div>
                  )}
                </div>
              )}
              <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {showHeader && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color, marginBottom: 4, paddingLeft: 4 }}>{msg.users?.nickname || '알 수 없음'}</span>}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {mine && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3E3E4A', flexShrink: 0 }}>{safeFormat(msg.created_at)}</span>}
                  <div style={{ padding: '10px 14px', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: mine ? '#c9f236' : '#1E1E22', color: mine ? '#171e00' : '#e5e2e3', border: mine ? 'none' : '1px solid #2A2A32', fontFamily: 'DM Sans, sans-serif' }}>
                    {msg.message}
                  </div>
                  {!mine && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3E3E4A', flexShrink: 0 }}>{safeFormat(msg.created_at)}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Participants */}
      {participants.length > 0 && (
        <details style={{ background: '#141416', borderTop: '1px solid #2A2A32', padding: '8px 16px', flexShrink: 0 }}>
          <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', listStyle: 'none' }}>
            <span>참여자 {participants.length}명</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
          </summary>
          <div style={{ paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {participants.map(p => (
              <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1E1E22', borderRadius: 999, padding: '4px 10px', border: p.user_id === userId ? '1px solid rgba(201,242,54,0.3)' : '1px solid #2A2A32' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: avatarColor(p.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{p.users?.nickname?.[0] || '?'}</div>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#e5e2e3' }}>{p.users?.nickname}</span>
                {p.user_id === userId && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: '#c9f236' }}>나</span>}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Input */}
      {token ? (
        <div style={{ background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2A2A32', padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea
            style={{ flex: 1, background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 14, padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3', resize: 'none', maxHeight: 96, outline: 'none', lineHeight: 1.5 }}
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={1}
            maxLength={500}
            onFocus={e => (e.target.style.borderColor = '#c9f236')}
            onBlur={e => (e.target.style.borderColor = '#2A2A32')}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || sending} style={{ height: 44, padding: '0 18px', background: !input.trim() || sending ? '#1E1E22' : '#c9f236', color: !input.trim() || sending ? '#3E3E4A' : '#171e00', borderRadius: 12, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', border: 'none', cursor: !input.trim() || sending ? 'default' : 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
            {sending ? '...' : '전송'}
          </button>
        </div>
      ) : (
        <div style={{ background: '#141416', borderTop: '1px solid #2A2A32', padding: '16px', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8A8A9A', marginBottom: 8 }}>로그인이 필요합니다</p>
          <button onClick={() => router.push('/login')} style={{ color: '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>로그인하기 →</button>
        </div>
      )}
    </div>
  );
}
