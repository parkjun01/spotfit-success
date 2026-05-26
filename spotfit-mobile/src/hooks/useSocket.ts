import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  spot_id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'notice' | 'status';
  created_at: string;
  nickname?: string;
}

export const useSupabaseChat = (spotId: string | null, userId: string | null) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spotId) return;
    setLoading(true);
    supabase
      .from('chat_messages')
      .select('*, users(nickname)')
      .eq('spot_id', spotId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setMessages(data.map((m: any) => ({ ...m, nickname: m.users?.nickname })));
        }
        setLoading(false);
      });
  }, [spotId]);

  useEffect(() => {
    if (!spotId) return;
    channelRef.current = supabase
      .channel(`spot-chat-${spotId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `spot_id=eq.${spotId}`,
      }, async (payload) => {
        const { data: user } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', payload.new.user_id)
          .single();
        setMessages(prev => [...prev, { ...(payload.new as ChatMessage), nickname: user?.nickname }]);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [spotId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!spotId || !userId || !text.trim()) return;
    await supabase.from('chat_messages').insert({
      spot_id: spotId,
      user_id: userId,
      message: text.trim(),
      message_type: 'text',
    });
  }, [spotId, userId]);

  const sendNotice = useCallback(async (text: string) => {
    if (!spotId || !userId || !text.trim()) return;
    await supabase.from('chat_messages').insert({
      spot_id: spotId,
      user_id: userId,
      message: text.trim(),
      message_type: 'notice',
    });
  }, [spotId, userId]);

  const updateStatus = useCallback(async (status: 'ready' | 'in_progress' | 'completed', nickname: string) => {
    if (!spotId || !userId) return;
    const labels: Record<string, string> = { ready: '준비 중', in_progress: '운동 중', completed: '완료' };
    await supabase.from('chat_messages').insert({
      spot_id: spotId,
      user_id: userId,
      message: `${nickname}님 상태: ${labels[status]}`,
      message_type: 'status',
    });
  }, [spotId, userId]);

  return { messages, loading, sendMessage, sendNotice, updateStatus };
};
