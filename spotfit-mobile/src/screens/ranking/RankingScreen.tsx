import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { rankingApi } from '../../api/authApi';
import { COLORS } from '../../utils/constants';

interface RankEntry {
  id: string;
  nickname: string;
  profileImage: string | null;
  mannerScore: number;
  spotCount: number;
  activityScore: number;
  rankPosition: number;
}

export const RankingScreen = () => {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedSport, setSelectedSport] = useState('');
  const [loading, setLoading] = useState(true);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const res = await rankingApi.getRankings({ type: period, sportId: selectedSport || undefined, limit: 50 });
      setRankings(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    rankingApi.getSports().then(res => setSports(res.data.data));
  }, []);

  useEffect(() => { loadRankings(); }, [period, selectedSport]);

  const renderItem = ({ item, index }: { item: RankEntry; index: number }) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
    const mannerColor = item.mannerScore >= 38 ? COLORS.mannerHigh : item.mannerScore >= 30 ? COLORS.mannerMid : COLORS.mannerLow;

    return (
      <View style={[styles.rankItem, index < 3 && styles.rankItemTop]}>
        <Text style={styles.rankNo}>{medal || `${index + 1}`}</Text>
        <View style={styles.rankAvatar}>
          <Text style={styles.avatarText}>{item.nickname[0]}</Text>
        </View>
        <View style={styles.rankInfo}>
          <Text style={styles.rankNickname}>{item.nickname}</Text>
          <Text style={styles.rankStats}>스팟 {item.spotCount}회 · 활동점수 {item.activityScore}</Text>
        </View>
        <View style={[styles.mannerBadge, { backgroundColor: mannerColor + '15', borderColor: mannerColor }]}>
          <Text style={[styles.mannerText, { color: mannerColor }]}>★ {item.mannerScore.toFixed(1)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>🏆 랭킹</Text>

      {/* 기간 선택 */}
      <View style={styles.periodRow}>
        {(['weekly', 'monthly'] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'weekly' ? '주간' : '월간'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 종목 필터 */}
      <FlatList
        horizontal
        data={[{ id: '', name: '전체' }, ...sports]}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.sportChip, selectedSport === item.id && styles.sportChipActive]}
            onPress={() => setSelectedSport(item.id)}
          >
            <Text style={[styles.sportChipText, selectedSport === item.id && styles.sportChipTextActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sportList}
        style={styles.sportScroll}
      />

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={rankings}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>아직 랭킹이 없습니다</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, padding: 16, paddingBottom: 8 },
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  periodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  periodTextActive: { color: '#fff' },
  sportScroll: { maxHeight: 48 },
  sportList: { paddingHorizontal: 16, gap: 8 },
  sportChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  sportChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sportChipText: { fontSize: 13, color: COLORS.text },
  sportChipTextActive: { color: '#fff', fontWeight: '700' },
  loader: { marginTop: 60 },
  list: { padding: 16, gap: 10 },
  rankItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 12 },
  rankItemTop: { borderWidth: 1.5, borderColor: COLORS.warning + '60' },
  rankNo: { fontSize: 18, fontWeight: '700', color: COLORS.text, width: 30, textAlign: 'center' },
  rankAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  rankInfo: { flex: 1 },
  rankNickname: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  rankStats: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  mannerBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  mannerText: { fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 15 },
});
