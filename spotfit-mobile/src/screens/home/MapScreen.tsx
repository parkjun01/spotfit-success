import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import NaverMapView, { Marker, Circle } from 'react-native-nmap';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../../store/store';
import { fetchSpots, setFilter } from '../../store/slices/spotSlice';
import { useLocation } from '../../hooks/useLocation';
import { COLORS, STATUS_LABELS, DEFAULT_SEARCH_RADIUS } from '../../utils/constants';
import { SpotCard } from '../../components/SpotCard';

const SPORT_FILTERS = [
  { id: '', label: '전체' },
  { id: 'soccer', label: '⚽ 축구' },
  { id: 'basketball', label: '🏀 농구' },
  { id: 'badminton', label: '🏸 배드민턴' },
  { id: 'tennis', label: '🎾 테니스' },
  { id: 'running', label: '🏃 러닝' },
];

export const MapScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { spots, loading, filters } = useSelector((s: RootState) => s.spots);
  const { location, loading: locationLoading } = useLocation();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedSportLabel, setSelectedSportLabel] = useState('전체');
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    import('../../api/authApi').then(({ rankingApi }) => {
      rankingApi.getSports().then(res => setSports(res.data.data)).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (!location) return;
    dispatch(fetchSpots({
      lat: location.latitude,
      lng: location.longitude,
      radius: filters.radius,
      sportId: filters.sportId || undefined,
    }));
  }, [location, filters]);

  const handleSpotPress = (spotId: string) => {
    navigation.navigate('SpotDetail', { spotId });
  };

  if (locationLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* 종목 필터 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {sports.slice(0, 8).map(sport => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.filterChip, filters.sportId === sport.id && styles.filterChipActive]}
              onPress={() => dispatch(setFilter({ sportId: sport.id === filters.sportId ? null : sport.id }))}
            >
              <Text style={[styles.filterText, filters.sportId === sport.id && styles.filterTextActive]}>{sport.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 뷰 전환 */}
        <View style={styles.viewToggle}>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'map' && styles.toggleActive]} onPress={() => setViewMode('map')}>
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>지도</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]} onPress={() => setViewMode('list')}>
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>목록</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'map' ? (
        <NaverMapView
          style={styles.map}
          center={location ? { latitude: location.latitude, longitude: location.longitude, zoom: 14 } : { latitude: 37.5665, longitude: 126.9780, zoom: 12 }}
          showsMyLocationButton
          compass
          scaleBar
        >
          {/* 현재 위치 반경 표시 */}
          {location && (
            <Circle
              coordinate={{ latitude: location.latitude, longitude: location.longitude }}
              radius={filters.radius}
              color="rgba(79, 70, 229, 0.05)"
              outlineColor={COLORS.primary}
              outlineWidth={1}
            />
          )}

          {/* 스팟 마커 */}
          {spots.map(spot => (
            spot.latitude && spot.longitude ? (
              <Marker
                key={spot.id}
                coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
                pinColor={spot.status === 'full' ? '#EF4444' : spot.status === 'recruiting' ? '#10B981' : '#6B7280'}
                onClick={() => handleSpotPress(spot.id)}
                caption={{ text: spot.sportName, textSize: 12 }}
              />
            ) : null
          ))}
        </NaverMapView>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {loading && <ActivityIndicator color={COLORS.primary} style={styles.loader} />}
          {spots.map(spot => (
            <SpotCard key={spot.id} spot={spot} onPress={() => handleSpotPress(spot.id)} />
          ))}
          {!loading && spots.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>주변에 스팟이 없습니다</Text>
              <Text style={styles.emptySubText}>새로운 스팟을 만들어보세요!</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* 스팟 생성 버튼 */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateSpot')}>
        <Text style={styles.fabText}>+ 스팟 생성</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { backgroundColor: COLORS.surface, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 2 },
  filterScroll: { paddingHorizontal: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  viewToggle: { flexDirection: 'row', alignSelf: 'flex-end', marginRight: 12, marginTop: 6, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.surface },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 12, color: COLORS.textSecondary },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  map: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingVertical: 8 },
  loader: { marginTop: 40 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptySubText: { fontSize: 14, color: COLORS.textSecondary },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, elevation: 6 },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
