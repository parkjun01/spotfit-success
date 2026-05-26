'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Message {
  id: string; user_id: string; message: string;
  message_type: string; created_at: string;
  users?: { nickname: string; profile_image: string | null };
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
  const [input, setInput] = useState('');
  const [myStatus, setMyStatus] = useState('ready');
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [spotTitle, setSpotTitle] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { router.push('/login'); return; }

    // 유저 정보 로드
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setUserId(d.data?.id); setNickname(d.data?.nickname); });

    // 스팟 정보
    fetch(`/api/spots/${id}`).then(r => r.json()).then(d => setSpotTitle(d.data?.title || '채팅'));

    // 기존 메시지 로드
    supabase.from('chat_messages')
      .select('*, users(nickname, profile_image)')
      .eq('spot_id', id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => { if (data) setMessages(data); });

    // Supabase Realtime 구독 (Socket.io 대체)
    const channel = supabase
      .channel(`spot-chat-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `spot_id=eq.${id}`,
      }, async (payload) => {
        // 유저 정보 추가 로드
        const { data: user } = await supabase.from('users').select('nickname, profile_image').eq('id', payload.new.user_id).single();
        setMessages(prev => [...prev, { ...payload.new as Message, users: user || undefined }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (type: 'text' | 'status' = 'text', content?: string) => {
    const msg = content || input.trim();
    if (!msg || !userId) return;
    await supabase.from('chat_messages').insert({
      spot_id: id, user_id: userId, message: msg, message_type: type,
    });
    setInput('');
  };

  const handleStatusChange = async (status: string) => {
    setMyStatus(status);
    const label = STATUS_OPTIONS.find(s => s.value === status)?.label || status;
    await sendMessage('status', `${nickname}님 상태: ${label}`);
  };

  const isMe = (msg: Message) => msg.user_id === userId;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-500">←</button>
        <span className="font-bold flex-1 truncate">{spotTitle}</span>
      </header>

      {/* 상태 공유 바 */}
      <div className="bg-white border-b px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-gray-500 flex-shrink-0">내 상태:</span>
        {STATUS_OPTIONS.map(s => (
          <button key={s.value}
            onClick={() => handleStatusChange(s.value)}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              myStatus === s.value ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          if (msg.message_type === 'status' || msg.message_type === 'notice') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="bg-amber-50 border border-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full">
                  {msg.message_type === 'notice' ? '📢 ' : ''}{msg.message}
                </span>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe(msg) ? 'flex-row-reverse' : ''}`}>
              {!isMe(msg) && (
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {msg.users?.nickname?.[0]}
                </div>
              )}
              <div className={`max-w-[72%] ${isMe(msg) ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isMe(msg) && <span className="text-xs text-gray-400 px-1">{msg.users?.nickname}</span>}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe(msg) ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="text-xs text-gray-300 px-1">{format(new Date(msg.created_at), 'HH:mm')}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="bg-white border-t px-3 py-3 flex gap-2 items-end">
        <textarea
          className="flex-1 input resize-none max-h-24 text-sm py-2"
          placeholder="메시지를 입력하세요..."
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={1}
          maxLength={500}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim()}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex-shrink-0">
          전송
        </button>
      </div>
    </div>
  );
}
