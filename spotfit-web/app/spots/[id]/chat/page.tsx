'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';

type Role = 'host' | 'joined' | 'pending' | 'none';

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

const AVATAR_COLORS = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#0D9488','#6366F1'];
const avatarColor = (uid: string) => AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length];

export default function SpotChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pendingApplicants, setPendingApplicants] = useState<Participant[]>([]);
  const [input, setInput] = useState('');
  const [myStatus, setMyStatus] = useState('ready');
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [spotTitle, setSpotTitle] = useState('');
  const [hostId, setHostId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>('none');
  const [connected, setConnected] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    try {
      const t = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (!t) { router.push('/login'); return; }
      setToken(t);

      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      const u = stored ? JSON.parse(stored) : null;
      const currentUserId = u?.id || null;
      setUserId(currentUserId);
      setNickname(u?.nickname || '');

      fetch(`/api/spots/${id}`)
        .then(r => r.json())
        .then(d => {
          const spotData = d.data;
          setSpotTitle(spotData?.title || '채팅방');
          setHostId(spotData?.host_id || null);

          const allParts: Participant[] = spotData?.participations || [];
          const joined = allParts.filter((p: any) => p.status === 'joined');
          const pending = allParts.filter((p: any) => p.status === 'pending');
          setParticipants(joined);
          setPendingApplicants(pending);

          // 역할 결정
          if (currentUserId) {
            if (spotData?.host_id === currentUserId) {
              setRole('host');
            } else {
              const myPart = allParts.find((p: any) => p.user_id === currentUserId);
              setRole(myPart?.status === 'joined' ? 'joined' : myPart?.status === 'pending' ? 'pending' : 'none');
            }
          }
        })
        .catch(() => {});

      fetch(`/api/spots/${id}/messages?limit=50`, { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(d => {
          const msgs: Message[] = d.data || [];
          msgs.forEach(m => seenIds.current.add(m.id));
          setMessages(msgs);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch (e: any) {
      setPageError(e?.message || '초기화 오류');
      setLoading(false);
    }
  }, [id]);

  // 승인 대기 중일 때 3초마다 상태 확인 — 승인되면 자동으로 채팅 화면으로 전환
  useEffect(() => {
    if (role !== 'pending' || !userId) return;
    const check = () => {
      setCheckingApproval(true);
      fetch(`/api/spots/${id}`)
        .then(r => r.json())
        .then(d => {
          const allParts = d.data?.participations || [];
          const myPart = allParts.find((p: any) => p.user_id === userId);
          if (myPart?.status === 'joined') {
            setRole('joined');
            setParticipants(allParts.filter((p: any) => p.status === 'joined'));
          }
        })
        .catch(() => {})
        .finally(() => setCheckingApproval(false));
    };
    const timer = setInterval(check, 3000);
    return () => clearInterval(timer);
  }, [role, userId, id]);

  // Supabase Realtime
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
            }
          })
          .subscribe((status: string) => setConnected(status === 'SUBSCRIBED'));
        channelRef.current = channel;
      } catch (e) { console.error('Realtime 연결 실패:', e); }
    }).catch(() => {});
    return () => {
      if (channel) import('@/lib/supabase').then(({ supabase }) => supabase.removeChannel(channel)).catch(() => {});
    };
  }, [id]);

  // 폴링 (3초)
  useEffect(() => {
    if (!token || loading) return;
    const poll = () => {
      fetch(`/api/spots/${id}/messages?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          const fresh = (d.data || []).filter((m: Message) => !seenIds.current.has(m.id));
          if (fresh.length) {
            fresh.forEach((m: Message) => seenIds.current.add(m.id));
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
        }
        channelRef.current?.send({ type: 'broadcast', event: 'new_message', payload: saved });
      } else if (data.message) {
        alert(data.message);
      }
    } catch { alert('메시지 전송 실패'); } finally { setSending(false); }
  };

  const handleStatusChange = async (status: string) => {
    setMyStatus(status);
    const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    const displayName = nickname.endsWith('님') ? nickname : `${nickname}님`;
    await sendMessage('status', `${displayName} 상태: ${label}`);
  };

  const handleApprove = async (targetUserId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    setApproving(targetUserId + action);
    try {
      const res = await fetch(`/api/spots/${id}/participants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUserId, action }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.message); return; }

      if (action === 'approve') {
        const approved = pendingApplicants.find(p => p.user_id === targetUserId);
        if (approved) {
          setPendingApplicants(prev => prev.filter(p => p.user_id !== targetUserId));
          setParticipants(prev => [...prev, { ...approved, status: 'joined' }]);
          // 시스템 메시지
          const notice: Message = {
            id: `notice-${Date.now()}`,
            user_id: 'system',
            message: `${approved.users?.nickname}님이 참여 승인되었습니다 ✓`,
            message_type: 'notice',
            created_at: new Date().toISOString(),
          };
          seenIds.current.add(notice.id);
          setMessages(prev => [...prev, notice]);
        }
      } else {
        setPendingApplicants(prev => prev.filter(p => p.user_id !== targetUserId));
      }
    } finally { setApproving(null); }
  };

  const isMe = (msg: Message) => userId ? msg.user_id === userId : msg.users?.nickname === nickname;
  const safeFormat = (dateStr: string) => { try { return format(new Date(dateStr), 'HH:mm'); } catch { return ''; } };

  if (pageError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, background: '#131314' }}>
        <p style={{ fontSize: 40 }}>⚠️</p>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#e5e2e3', textAlign: 'center' }}>채팅을 불러올 수 없어요</p>
        <p style={{ fontSize: 13, color: '#8A8A9A', textAlign: 'center' }}>{pageError}</p>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', background: '#c9f236', color: '#171e00', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>돌아가기</button>
      </div>
    );
  }

  // 승인 대기 중인 경우 전용 화면
  if (role === 'pending') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0A0A0B' }}>
        <header style={{ background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
          </button>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#ffffef' }}>{spotTitle}</p>
        </header>

        {/* 메시지 읽기 전용 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4, filter: 'blur(1.5px)', pointerEvents: 'none', opacity: 0.5 }}>
          {messages.map((msg, idx) => {
            if (msg.message_type === 'status' || msg.message_type === 'notice') {
              return <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}><span style={{ background: 'rgba(255,255,255,0.06)', color: '#8A8A9A', fontSize: 12, padding: '4px 14px', borderRadius: 999 }}>{msg.message}</span></div>;
            }
            const mine = isMe(msg);
            const prev = messages[idx - 1];
            const showHeader = !mine && (!prev || prev.message_type === 'status' || prev.user_id !== msg.user_id);
            return (
              <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: mine ? 'row-reverse' : 'row', marginTop: showHeader ? 12 : 2 }}>
                {!mine && <div style={{ width: 36, flexShrink: 0 }}>{showHeader && <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(msg.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 700, color: '#fff' }}>{msg.users?.nickname?.[0] || '?'}</div>}</div>}
                <div style={{ maxWidth: '68%' }}>
                  {showHeader && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: avatarColor(msg.user_id), marginBottom: 4, paddingLeft: 4, display: 'block' }}>{msg.users?.nickname}</span>}
                  <div style={{ padding: '10px 14px', fontSize: 14, borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: mine ? '#c9f236' : '#1E1E22', color: mine ? '#171e00' : '#e5e2e3' }}>{msg.message}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 승인 대기 배너 */}
        <div style={{ background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid #2A2A32', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(201,242,54,0.1)', border: '2px solid rgba(201,242,54,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {checkingApproval
              ? <div style={{ width: 22, height: 22, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              : <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#c9f236' }}>hourglass_top</span>
            }
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 17, fontWeight: 700, color: '#ffffef', marginBottom: 4 }}>호스트 승인 대기 중</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A', lineHeight: 1.5 }}>팀장이 참여를 승인하면<br/>자동으로 채팅에 연결됩니다</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#3E3E4A', marginTop: 8 }}>3초마다 자동 확인 중...</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: 'rgba(201,242,54,0.1)', border: '1px solid rgba(201,242,54,0.3)', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 13, color: '#c9f236', cursor: 'pointer' }}>새로고침</button>
            <button onClick={() => router.back()} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #2A2A32', borderRadius: 10, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 13, color: '#8A8A9A', cursor: 'pointer' }}>돌아가기</button>
          </div>
        </div>
      </div>
    );
  }

  const canChat = role === 'host' || role === 'joined';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0A0A0B' }}>

      {/* Header */}
      <header style={{ background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #2A2A32', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#ffffef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spotTitle || '채팅방'}</p>
            {role === 'host' && <span style={{ background: '#c9f236', color: '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>HOST</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22C55E' : '#3E3E4A' }} />
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#8A8A9A' }}>{connected ? `실시간 · ${participants.length}명` : '연결 중...'}</span>
          </div>
        </div>

        {/* 호스트: 대기자 수 뱃지 */}
        {role === 'host' && (
          <button onClick={() => setShowApprovalPanel(v => !v)} style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: showApprovalPanel ? 'rgba(201,242,54,0.15)' : '#1E1E22', border: `1px solid ${showApprovalPanel ? '#c9f236' : '#2A2A32'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#c9f236' }}>group_add</span>
            {pendingApplicants.length > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0A0A0B' }}>
                {pendingApplicants.length}
              </span>
            )}
          </button>
        )}

        <div style={{ display: 'flex' }}>
          {participants.slice(0, 4).map(p => (
            <div key={p.user_id} title={p.users?.nickname} style={{ width: 28, height: 28, borderRadius: '50%', background: p.user_id === hostId ? '#c9f236' : avatarColor(p.user_id), border: '2px solid #0A0A0B', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color: p.user_id === hostId ? '#171e00' : '#fff' }}>
              {p.users?.nickname?.[0] || '?'}
            </div>
          ))}
          {participants.length > 4 && <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2a2a2b', border: '2px solid #0A0A0B', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A' }}>+{participants.length - 4}</div>}
        </div>
      </header>

      {/* 호스트 전용: 신청 승인 패널 */}
      {role === 'host' && showApprovalPanel && (
        <div style={{ background: '#141416', borderBottom: '1px solid #2A2A32', padding: '12px 16px', flexShrink: 0 }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#c9f236', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#c9f236', display: 'inline-block' }} />
            참가 신청 대기 ({pendingApplicants.length}명)
          </p>
          {pendingApplicants.length === 0 ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#3E3E4A', textAlign: 'center', padding: '8px 0' }}>대기 중인 신청이 없습니다</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingApplicants.map(p => (
                <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1E1E22', borderRadius: 10, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(p.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.users?.nickname?.[0] || '?'}</div>
                    <div>
                      <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3' }}>{p.users?.nickname}</p>
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#8A8A9A' }}>매너 {p.users?.manner_score?.toFixed(1)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleApprove(p.user_id, 'approve')} disabled={approving !== null} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', border: '1px solid #22C55E', color: '#22C55E', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>승인</button>
                    <button onClick={() => handleApprove(p.user_id, 'reject')} disabled={approving !== null} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', color: '#EF4444', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>거절</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 내 상태 변경 바 */}
      {canChat && (
        <div style={{ background: '#141416', borderBottom: '1px solid #2A2A32', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', flexShrink: 0 }} className="no-scrollbar">
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', flexShrink: 0 }}>내 상태</span>
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => handleStatusChange(s.value)} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 999, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', border: `1px solid ${myStatus === s.value ? '#c9f236' : '#2A2A32'}`, background: myStatus === s.value ? 'rgba(201,242,54,0.1)' : '#1E1E22', color: myStatus === s.value ? '#c9f236' : '#8A8A9A', cursor: 'pointer', transition: 'all 0.2s' }}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 32 }}><div style={{ width: 24, height: 24, border: '3px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
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
          const isHostMsg = msg.user_id === hostId;
          const color = avatarColor(msg.user_id);
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 8, flexDirection: mine ? 'row-reverse' : 'row', marginTop: showHeader ? 12 : 2 }}>
              {!mine && (
                <div style={{ width: 36, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  {showHeader && (
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: isHostMsg ? '#c9f236' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: isHostMsg ? '#171e00' : '#fff' }}>
                      {msg.users?.nickname?.[0] || '?'}
                    </div>
                  )}
                </div>
              )}
              <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {showHeader && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, paddingLeft: 4 }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, color: isHostMsg ? '#c9f236' : color }}>{msg.users?.nickname || '알 수 없음'}</span>
                    {isHostMsg && <span style={{ background: '#c9f236', color: '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 9, fontWeight: 700, padding: '0px 4px', borderRadius: 3 }}>HOST</span>}
                  </div>
                )}
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

      {/* 참여자 목록 */}
      {participants.length > 0 && (
        <details style={{ background: '#141416', borderTop: '1px solid #2A2A32', padding: '8px 16px', flexShrink: 0 }}>
          <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#8A8A9A', listStyle: 'none' }}>
            <span>참여자 {participants.length}명</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
          </summary>
          <div style={{ paddingTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {participants.map(p => (
              <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1E1E22', borderRadius: 999, padding: '4px 10px', border: p.user_id === userId ? '1px solid rgba(201,242,54,0.3)' : '1px solid #2A2A32' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: p.user_id === hostId ? '#c9f236' : avatarColor(p.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: p.user_id === hostId ? '#171e00' : '#fff' }}>{p.users?.nickname?.[0] || '?'}</div>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#e5e2e3' }}>{p.users?.nickname}</span>
                {p.user_id === hostId && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: '#c9f236' }}>HOST</span>}
                {p.user_id === userId && p.user_id !== hostId && <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: '#c9f236' }}>나</span>}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 입력창 */}
      {canChat ? (
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
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#8A8A9A', marginBottom: 8 }}>로그인 후 참여해주세요</p>
          <button onClick={() => router.push('/login')} style={{ color: '#c9f236', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>로그인하기 →</button>
        </div>
      )}
    </div>
  );
}
