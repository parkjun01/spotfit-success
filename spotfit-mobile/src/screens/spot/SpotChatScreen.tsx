import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { useSupabaseChat, ChatMessage } from '../../hooks/useSocket';
import { COLORS } from '../../utils/constants';
import { format } from 'date-fns';

const STATUS_EMOJI: Record<string, string> = { ready: '🟡', in_progress: '🟢', completed: '✅' };
const STATUS_LABELS: Record<string, string> = { ready: '준비 중', in_progress: '운동 중', completed: '완료' };

export const SpotChatScreen = () => {
  const { params } = useRoute<any>();
  const user = useSelector((s: RootState) => s.auth.user);
  const { messages, loading, sendMessage, sendNotice, updateStatus } = useSupabaseChat(
    params.spotId,
    user?.id ?? null,
  );
  const [input, setInput] = useState('');
  const [myStatus, setMyStatus] = useState<'ready' | 'in_progress' | 'completed'>('ready');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length) flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input.trim());
    setInput('');
  };

  const handleStatusChange = async (status: 'ready' | 'in_progress' | 'completed') => {
    setMyStatus(status);
    await updateStatus(status, user?.nickname ?? '');
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.user_id === user?.id;
    if (item.message_type === 'notice' || item.message_type === 'status') {
      return (
        <View style={styles.noticeMessage}>
          <Text style={styles.noticeText}>
            {item.message_type === 'notice' ? '📢 ' : ''}{item.message}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.nickname ?? '?')[0]}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && <Text style={styles.senderName}>{item.nickname}</Text>}
          <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.message}</Text>
          <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
            {format(new Date(item.created_at), 'HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.statusBar}>
        <Text style={styles.statusLabel}>내 상태:</Text>
        {(['ready', 'in_progress', 'completed'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, myStatus === s && styles.statusBtnActive]}
            onPress={() => handleStatusChange(s)}
          >
            <Text style={[styles.statusBtnText, myStatus === s && styles.statusBtnTextActive]}>
              {STATUS_EMOJI[s]} {STATUS_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>첫 메시지를 보내보세요!</Text>
            </View>
          )
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={handleSend} disabled={!input.trim()}>
          <Text style={styles.sendText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  statusBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusLabel: { fontSize: 12, color: COLORS.textSecondary },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  statusBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusBtnText: { fontSize: 11, color: COLORS.textSecondary },
  statusBtnTextActive: { color: '#fff', fontWeight: '700' },
  messageList: { padding: 16, gap: 12, flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.textSecondary, fontSize: 14 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowMe: { flexDirection: 'row-reverse' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 16 },
  bubbleOther: { backgroundColor: COLORS.surface, borderTopLeftRadius: 4 },
  bubbleMe: { backgroundColor: COLORS.primary, borderTopRightRadius: 4 },
  senderName: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 3 },
  messageText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  messageTextMe: { color: '#fff' },
  timeText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 3 },
  timeTextMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  noticeMessage: { alignSelf: 'center', backgroundColor: COLORS.warning + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginVertical: 4 },
  noticeText: { fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10 },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.text, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22 },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
