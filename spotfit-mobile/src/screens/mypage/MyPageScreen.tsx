import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { userApi } from '../../api/authApi';
import { COLORS } from '../../utils/constants';

export const MyPageScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const [mySpots, setMySpots] = useState<any[]>([]);
  const [pendingEvals, setPendingEvals] = useState<any[]>([]);

  useEffect(() => {
    userApi.getMySpots('participated', 5).then(res => setMySpots(res.data.data));
    import('../../api/authApi').then(({ evaluationApi }) => {
      evaluationApi.getPendingEvaluations().then(res => setPendingEvals(res.data.data));
    });
  }, []);

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const mannerColor = user ? (user.mannerScore >= 38 ? COLORS.mannerHigh : user.mannerScore >= 30 ? COLORS.mannerMid : COLORS.mannerLow) : COLORS.textSecondary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.nickname[0] || '?'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.nickname}>{user?.nickname}</Text>
          <Text style={styles.region}>{user?.activityRegion || '지역 미설정'}</Text>
          <View style={styles.badges}>
            {user?.subscriptionStatus === 'premium' && (
              <View style={styles.premiumBadge}><Text style={styles.premiumText}>👑 Premium</Text></View>
            )}
            {user?.badges?.slice(0, 3).map(badge => (
              <View key={badge.id} style={styles.badgeChip}><Text style={styles.badgeText}>{badge.name}</Text></View>
            ))}
          </View>
        </View>
        <View style={[styles.mannerCircle, { borderColor: mannerColor }]}>
          <Text style={[styles.mannerScore, { color: mannerColor }]}>{user?.mannerScore.toFixed(1)}</Text>
          <Text style={styles.mannerLabel}>매너</Text>
        </View>
      </View>

      {/* 평가 대기 */}
      {pendingEvals.length > 0 && (
        <TouchableOpacity style={styles.evalBanner} onPress={() => navigation.navigate('PendingEvaluations')}>
          <Text style={styles.evalBannerText}>⭐ 평가 대기 {pendingEvals.length}건 — 지금 평가하기</Text>
        </TouchableOpacity>
      )}

      {/* 참여 이력 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 참여 이력</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MySpots')}><Text style={styles.seeAll}>전체보기</Text></TouchableOpacity>
        </View>
        {mySpots.length === 0 ? (
          <Text style={styles.empty}>아직 참여한 스팟이 없습니다</Text>
        ) : (
          mySpots.map(spot => (
            <TouchableOpacity key={spot.id} style={styles.spotItem} onPress={() => navigation.navigate('SpotDetail', { spotId: spot.id })}>
              <View style={styles.spotItemLeft}>
                <Text style={styles.spotItemSport}>{spot.sport_name}</Text>
                <Text style={styles.spotItemTitle} numberOfLines={1}>{spot.title}</Text>
              </View>
              <Text style={styles.spotItemStatus}>{spot.status}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* 메뉴 */}
      <View style={styles.section}>
        <MenuItem label="프로필 수정" onPress={() => navigation.navigate('EditProfile')} />
        <MenuItem label="프리미엄 구독" onPress={() => navigation.navigate('Premium')} badge={user?.subscriptionStatus !== 'premium'} />
        <MenuItem label="알림 설정" onPress={() => {}} />
        <MenuItem label="이용약관" onPress={() => {}} />
        <MenuItem label="개인정보 처리방침" onPress={() => {}} />
        <MenuItem label="로그아웃" onPress={handleLogout} danger />
        <MenuItem label="회원탈퇴" onPress={() => navigation.navigate('Withdraw')} danger />
      </View>
    </ScrollView>
  );
};

const MenuItem = ({ label, onPress, badge, danger }: { label: string; onPress: () => void; badge?: boolean; danger?: boolean }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
    {badge && <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>NEW</Text></View>}
    <Text style={styles.menuArrow}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  profileInfo: { flex: 1 },
  nickname: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  region: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  premiumBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  premiumText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  badgeChip: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, color: COLORS.primary },
  mannerCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  mannerScore: { fontSize: 15, fontWeight: '800' },
  mannerLabel: { fontSize: 10, color: COLORS.textSecondary },
  evalBanner: { backgroundColor: COLORS.warning + '20', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.warning + '40' },
  evalBannerText: { color: '#92400E', fontWeight: '700', textAlign: 'center' },
  section: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 13, color: COLORS.primary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 16 },
  spotItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  spotItemLeft: { flex: 1 },
  spotItemSport: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  spotItemTitle: { fontSize: 14, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  spotItemStatus: { fontSize: 12, color: COLORS.textSecondary },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  menuLabelDanger: { color: COLORS.danger },
  menuBadge: { backgroundColor: COLORS.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  menuBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  menuArrow: { fontSize: 20, color: COLORS.textSecondary },
});
