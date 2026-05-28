'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  users: { nickname: string; manner_score: number };
}

const STATUS_OPTIONS = [
  { value: 'ready',       label: '🟡 준비 중' },
  { value: 'in_progress', label: '🟢 운동 중' },
  { value: 'completed',   label: '✅ 완료' },
];

export default function SpotChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [messages, setMessages]           = useState<Message[]>([]);
  const [participants, setParticipants]   = useState<Participant[]>([]);
  const [input, setInput]                 = useState('');
  const [myStatus, setMyStatus]           = useState('ready');
  const [userId, setUserId]               = useState<string | null>(null);
  const [nickname, setNickname]           = useState('');
  const [spotTitle, setSpotTitle]         = useState('');
  const [token, setToken]                 = useState<string | null>(null);
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [isParticipant, setIsParticipant] = useState(false);
  const [connected, setConnected]         = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenIds        = useRef(new Set<string>());   // 중복 방지
  const lastCreatedAt  = useRef('');

  // ── 초기 로딩 ──────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (!t) { router.push('/login'); return; }
    setToken(t);

    try {
      const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      setUserId(u.id || null);
      setNickname(u.nickname || '');
    } catch {}

    // 스팟 정보 + 참여자
    fetch(`/api/spots/${id}`)
      .then(r => r.json())
      .then(d => {
        setSpotTitle(d.data?.title || '채팅방');
        const parts: Participant[] = (d.data?.participations || []).filter((p: any) => p.status === 'joined');
        setParticipants(parts);
      });

    // 최근 메시지 50개
    fetch(`/api/spots/${id}/messages?limit=50`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        const msgs: Message[] = d.data || [];
        msgs.forEach(m => seenIds.current.add(m.id));
        setMessages(msgs);
        if (msgs.length) lastCreatedAt.current = msgs[msgs.length - 1].created_at;
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── 참여자 여부 ────────────────────────────────────────────
  useEffect(() => {
    if (userId) setIsParticipant(participants.some(p => p.user_id === userId));
  }, [userId, participants]);

  // ── Supabase Realtime broadcast 구독 ───────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${id}`, { config: { broadcast: { ack: false } } })
      .on('broadcast', { event: 'new_message' }, ({ payload }: { payload: Message }) => {
        if (!seenIds.current.has(payload.id)) {
          seenIds.current.add(payload.id);
          setMessages(prev => [...prev, payload]);
          lastCreatedAt.current = payload.created_at;
        }
      })
      .subscribe(status => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // ── 폴백 폴링 (30초마다 — 브로드캐스트 놓친 메시지 보완) ──
  useEffect(() => {
    if (!token || loading) return;
    const timer = setInterval(() => {
      const after = lastCreatedAt.current;
      if (!after) return;
      fetch(`/api/spots/${id}/messages?after=${encodeURIComponent(after)}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          const newMsgs: Message[] = d.data || [];
          const fresh = newMsgs.filter(m => !seenIds.current.has(m.id));
          if (fresh.length) {
            fresh.forEach(m => seenIds.current.add(m.id));
            setMessages(prev => [...prev, ...fresh]);
            lastCreatedAt.current = fresh[fresh.length - 1].created_at;
          }
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(timer);
  }, [id, token, loading]);

  // ── 스크롤 ─────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 메시지 전송 ────────────────────────────────────────────
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
        // 내 화면에 즉시 표시
        if (!seenIds.current.has(saved.id)) {
          seenIds.current.add(saved.id);
          setMessages(prev => [...prev, saved]);
          lastCreatedAt.current = saved.created_at;
        }
        // 다른 사람들에게 실시간 브로드캐스트
        channelRef.current?.send({
          type: 'broadcast',
          event: 'new_message',
          payload: saved,
        });
      }
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setMyStatus(status);
    const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    await sendMessage('status', `${nickname}님 상태: ${label}`);
  };

  const isMe = (msg: Message) => msg.user_id === userId;
  const mannerColor = (s: number) =>
    s >= 38 ? 'text-emerald-600' : s >= 30 ? 'text-amber-500' : 'text-red-500';

  // ── 렌더 ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{spotTitle}</p>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-400">
              {connected ? `실시간 연결됨 · ${participants.length}명` : '연결 중...'}
            </span>
          </div>
        </div>
        {/* 참여자 아바타 */}
        <div className="flex -space-x-2">
          {participants.slice(0, 4).map(p => (
            <div
              key={p.user_id}
              title={p.users?.nickname}
              className="w-7 h-7 rounded-full bg-primary border-2 border-white flex items-center justify-center text-white text-xs font-bold"
            >
              {p.users?.nickname?.[0]}
            </div>
          ))}
          {participants.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-bold">
              +{participants.length - 4}
            </div>
          )}
        </div>
      </header>

      {/* 상태 공유 바 (참여자만) */}
      {isParticipant && (
        <div className="bg-white border-b px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-gray-400 flex-shrink-0 font-medium">내 상태:</span>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors border ${
                myStatus === s.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && (
          <div className="flex justify-center pt-8">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center pt-16 space-y-2">
            <p className="text-3xl">💬</p>
            <p className="text-sm text-gray-400">아직 메시지가 없습니다.<br />첫 번째로 인사해보세요!</p>
          </div>
        )}
        {messages.map(msg => {
          if (msg.message_type === 'status' || msg.message_type === 'notice') {
            return (
              <div key={msg.id} className="flex justify-center my-1">
                <span className="bg-amber-50 border border-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full">
                  {msg.message_type === 'notice' ? '📢 ' : ''}{msg.message}
                </span>
              </div>
            );
          }
          const mine = isMe(msg);
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && (
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {msg.users?.nickname?.[0] || '?'}
                </div>
              )}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
                {!mine && <span className="text-xs text-gray-400 px-1">{msg.users?.nickname}</span>}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  mine
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="text-xs text-gray-300 px-1">
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 참여자 목록 (접기/펼치기) */}
      {participants.length > 0 && (
        <details className="bg-white border-t px-4 py-2 group">
          <summary className="flex items-center justify-between list-none cursor-pointer text-xs text-gray-400 select-none">
            <span>참여자 {participants.length}명 보기</span>
            <span className="group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="pt-2 pb-1 flex flex-wrap gap-2">
            {participants.map(p => (
              <div key={p.user_id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {p.users?.nickname?.[0]}
                </div>
                <span className="text-xs font-medium text-gray-700">{p.users?.nickname}</span>
                <span className={`text-xs font-bold ${mannerColor(p.users?.manner_score ?? 36.5)}`}>
                  ★{(p.users?.manner_score ?? 36.5).toFixed(1)}
                </span>
                {p.user_id === userId && <span className="text-xs text-indigo-400 font-semibold">나</span>}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 입력창 */}
      {isParticipant ? (
        <div className="bg-white border-t px-3 py-3 flex gap-2 items-end">
          <textarea
            className="flex-1 input resize-none max-h-24 text-sm py-2.5"
            placeholder="메시지를 입력하세요..."
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={1}
            maxLength={500}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 flex-shrink-0 transition-opacity"
          >
            {sending ? '...' : '전송'}
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border-t px-4 py-3 text-center text-sm text-gray-400">
          채팅방에 참여한 멤버만 메시지를 보낼 수 있습니다
        </div>
      )}
    </div>
  );
}
