import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Spot } from '../api/spotApi';
import { COLORS, DIFFICULTY_LABELS, STATUS_LABELS } from '../utils/constants';
import { formatDistance, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  spot: Spot;
  onPress: () => void;
}

const MannerBadge = ({ score }: { score: number }) => {
  const color = score >= 38 ? COLORS.mannerHigh : score >= 30 ? COLORS.mannerMid : COLORS.mannerLow;
  return (
    <View style={[styles.mannerBadge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.mannerText, { color }]}>★ {score.toFixed(1)}</Text>
    </View>
  );
};

export const SpotCard = ({ spot, onPress }: Props) => {
  const startsAt = new Date(spot.startsAt);
  const timeFromNow = formatDistance(startsAt, new Date(), { addSuffix: true, locale: ko });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.sportBadge}>
          <Text style={styles.sportText}>{spot.sportName}</Text>
        </View>
        <View style={[styles.statusBadge, spot.status === 'full' && styles.statusFull]}>
          <Text style={styles.statusText}>{STATUS_LABELS[spot.status]}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>{spot.title}</Text>

      <View style={styles.info}>
        <Text style={styles.infoText}>📍 {spot.locationName}</Text>
        {spot.distance !== null && <Text style={styles.infoText}>{(spot.distance / 1000).toFixed(1)}km</Text>}
      </View>
      <View style={styles.info}>
        <Text style={styles.infoText}>🕐 {format(startsAt, 'MM/dd HH:mm')} ({timeFromNow})</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.participants}>
          <Text style={styles.participantsText}>
            👥 {spot.currentParticipants}/{spot.maxParticipants}명
          </Text>
          <Text style={styles.difficultyText}>{DIFFICULTY_LABELS[spot.difficultyLevel]}</Text>
        </View>
        <View style={styles.hostInfo}>
          <Text style={styles.hostName}>{spot.hostNickname}</Text>
          <MannerBadge score={spot.hostMannerScore} />
        </View>
      </View>

      {spot.tags.length > 0 && (
        <View style={styles.tags}>
          {spot.tags.slice(0, 3).map(tag => (
            <View key={tag.id} style={styles.tag}>
              <Text style={styles.tagText}>{tag.name}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sportBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  sportText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  statusBadge: { backgroundColor: COLORS.success + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusFull: { backgroundColor: COLORS.danger + '15' },
  statusText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  info: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, marginRight: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  participants: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantsText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  difficultyText: { fontSize: 12, color: COLORS.textSecondary },
  hostInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hostName: { fontSize: 12, color: COLORS.textSecondary },
  mannerBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  mannerText: { fontSize: 11, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  tag: { backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 11, color: COLORS.textSecondary },
});
