import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { spotsApi, Spot } from '../../api/spotApi';
import { joinSpot } from '../../store/slices/spotSlice';
import { RootState, AppDispatch } from '../../store/store';
import { COLORS, DIFFICULTY_LABELS, STATUS_LABELS } from '../../utils/constants';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export const SpotDetailScreen = () => {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    spotsApi.getSpotById(params.spotId)
      .then(res => setSpot(res.data.data))
      .finally(() => setLoading(false));
  }, [params.spotId]);

  const handleJoin = async () => {
    if (!user) { navigation.navigate('Auth'); return; }
    if (user.mannerScore < 30) {
      Alert.alert('참여 불가', '매너 점수가 30점 미만이라 참여할 수 없습니다');
      return;
    }
    setJoining(true);
    try {
      await dispatch(joinSpot(params.spotId)).unwrap();
      Alert.alert('참여 완료!', `${spot?.title}에 참여했습니다 🎉`, [
        { text: '채팅 참여', onPress: () => navigation.navigate('SpotChat', { spotId: params.spotId, spotTitle: spot?.title }) },
        { text: '확인' },
      ]);
      const res = await spotsApi.getSpotById(params.spotId);
      setSpot(res.data.data);
    } catch (err: any) {
      Alert.alert('오류', err.message || '참여에 실패했습니다');
    } finally { setJoining(false); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} /></View>;
  if (!spot) return <View style={styles.centered}><Text>스팟을 찾을 수 없습니다</Text></View>;

  const isHost = user?.id === spot.hostId;
  const isParticipant = spot.participants.some(p => p.id === user?.id);
  const isFull = spot.status === 'full';
  const canJoin = !isHost && !isParticipant && !isFull && spot.status === 'recruiting';

  const mannerColor = spot.hostMannerScore >= 38 ? COLORS.mannerHigh : spot.hostMannerScore >= 30 ? COLORS.mannerMid : COLORS.mannerLow;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.sportRow}>
          <View style={styles.sportBadge}><Text style={styles.sportText}>{spot.sportName}</Text></View>
          <View style={[styles.statusBadge, isFull && styles.statusFull]}>
            <Text style={styles.statusText}>{STATUS_LABELS[spot.status]}</Text>
          </View>
          <View style={styles.diffBadge}><Text style={styles.diffText}>{DIFFICULTY_LABELS[spot.difficultyLevel]}</Text></View>
        </View>
        <Text style={styles.title}>{spot.title}</Text>
      </View>

      {/* 호스트 정보 */}
      <View style={styles.hostCard}>
        <View style={styles.hostAvatar}>
          <Text style={styles.avatarText}>{spot.hostNickname[0]}</Text>
        </View>
        <View style={styles.hostInfo}>
          <Text style={styles.hostLabel}>호스트</Text>
          <Text style={styles.hostName}>{spot.hostNickname}</Text>
        </View>
        <View style={[styles.mannerBadge, { backgroundColor: mannerColor + '15', borderColor: mannerColor }]}>
          <Text style={[styles.mannerText, { color: mannerColor }]}>★ {spot.hostMannerScore.toFixed(1)}</Text>
        </View>
      </View>

      {/* 핵심 정보 (PRD: 원룸 매물처럼) */}
      <View style={styles.infoGrid}>
        <InfoItem icon="📍" label="장소" value={spot.locationName} />
        <InfoItem icon="🕐" label="일시" value={format(new Date(spot.startsAt), 'MM월 dd일 HH:mm', { locale: ko })} />
        <InfoItem icon="👥" label="인원" value={`${spot.currentParticipants}/${spot.maxParticipants}명`} />
        {spot.distance !== null && <InfoItem icon="📏" label="거리" value={`${(spot.distance / 1000).toFixed(1)}km`} />}
      </View>

      {/* 설명 */}
      {spot.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상세 설명</Text>
          <Text style={styles.description}>{spot.description}</Text>
        </View>
      )}

      {/* 태그 */}
      {spot.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>태그</Text>
          <View style={styles.tags}>
            {spot.tags.map(tag => (
              <View key={tag.id} style={styles.tag}><Text style={styles.tagText}>{tag.name}</Text></View>
            ))}
          </View>
        </View>
      )}

      {/* 참여자 목록 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>참여자 ({spot.participants.length}명)</Text>
        <View style={styles.participants}>
          {spot.participants.map(p => (
            <View key={p.id} style={styles.participant}>
              <View style={styles.participantAvatar}><Text style={styles.avatarText}>{p.nickname[0]}</Text></View>
              <Text style={styles.participantName} numberOfLines={1}>{p.nickname}</Text>
              <Text style={styles.participantManner}>★{p.mannerScore.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 액션 버튼 */}
      <View style={styles.actions}>
        {isHost && (
          <>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.navigate('EditSpot', { spot })}>
              <Text style={styles.btnSecondaryText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnChat]} onPress={() => navigation.navigate('SpotChat', { spotId: spot.id, spotTitle: spot.title })}>
              <Text style={styles.btnText}>채팅방</Text>
            </TouchableOpacity>
          </>
        )}
        {isParticipant && !isHost && (
          <TouchableOpacity style={[styles.btn, styles.btnChat]} onPress={() => navigation.navigate('SpotChat', { spotId: spot.id, spotTitle: spot.title })}>
            <Text style={styles.btnText}>💬 채팅방 입장</Text>
          </TouchableOpacity>
        )}
        {canJoin && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleJoin} disabled={joining}>
            {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>참여하기</Text>}
          </TouchableOpacity>
        )}
        {isFull && !isParticipant && (
          <View style={[styles.btn, styles.btnDisabled]}>
            <Text style={styles.btnDisabledText}>마감된 스팟입니다</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const InfoItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  sportRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sportBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sportText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  statusBadge: { backgroundColor: COLORS.success + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusFull: { backgroundColor: COLORS.danger + '15' },
  statusText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  diffBadge: { backgroundColor: COLORS.warning + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  diffText: { color: COLORS.warning, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  hostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 12, gap: 12 },
  hostAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  hostInfo: { flex: 1 },
  hostLabel: { fontSize: 11, color: COLORS.textSecondary },
  hostName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  mannerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1.5 },
  mannerText: { fontSize: 13, fontWeight: '800' },
  infoGrid: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '45%' },
  infoIcon: { fontSize: 20 },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  section: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 12, color: COLORS.textSecondary },
  participants: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  participant: { alignItems: 'center', width: 60 },
  participantAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  participantName: { fontSize: 11, color: COLORS.text, textAlign: 'center' },
  participantManner: { fontSize: 11, color: COLORS.warning },
  actions: { gap: 10, marginTop: 8 },
  btn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnSecondary: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.primary },
  btnSecondaryText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  btnChat: { backgroundColor: COLORS.secondary },
  btnDisabled: { backgroundColor: COLORS.border },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabledText: { color: COLORS.textSecondary, fontSize: 16 },
});
