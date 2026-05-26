import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import NaverMapView, { Marker } from 'react-native-nmap';
import { useNavigation } from '@react-navigation/native';
import { spotsApi } from '../../api/spotApi';
import { rankingApi } from '../../api/authApi';
import { COLORS, DIFFICULTY_LABELS } from '../../utils/constants';
import { useLocation } from '../../hooks/useLocation';

interface Coord { latitude: number; longitude: number; }

export const CreateSpotScreen = () => {
  const navigation = useNavigation<any>();
  const { location } = useLocation();

  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; classification: string }[]>([]);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<Coord | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    locationName: '',
    maxParticipants: '6',
    difficultyLevel: 'beginner',
    startsAt: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: 기본정보, 2: 장소선택, 3: 태그

  useEffect(() => {
    rankingApi.getSports().then(res => setSports(res.data.data));
    rankingApi.getTags().then(res => setTags(res.data.data));
  }, []);

  const toggleTag = (id: string) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!selectedSport) { Alert.alert('오류', '종목을 선택해주세요'); return; }
    if (!form.title.trim()) { Alert.alert('오류', '제목을 입력해주세요'); return; }
    if (!selectedCoord || !form.locationName.trim()) { Alert.alert('오류', '장소를 선택해주세요'); return; }
    if (!form.startsAt) { Alert.alert('오류', '시작 일시를 입력해주세요'); return; }

    setSubmitting(true);
    try {
      const res = await spotsApi.createSpot({
        sportId: selectedSport,
        title: form.title,
        description: form.description,
        locationName: form.locationName,
        latitude: selectedCoord.latitude,
        longitude: selectedCoord.longitude,
        maxParticipants: parseInt(form.maxParticipants),
        difficultyLevel: form.difficultyLevel,
        startsAt: new Date(form.startsAt).toISOString(),
        tagIds: selectedTags,
      });
      Alert.alert('스팟 생성 완료!', '스팟이 생성되었습니다 🎉', [
        { text: '확인', onPress: () => navigation.navigate('SpotDetail', { spotId: res.data.data.spotId }) },
      ]);
    } catch (err: any) {
      Alert.alert('오류', err.response?.data?.message || '스팟 생성에 실패했습니다');
    } finally { setSubmitting(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>스팟 생성</Text>

      {/* Step 1: 기본 정보 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>종목 선택</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportList}>
          {sports.map(sport => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.sportChip, selectedSport === sport.id && styles.sportChipActive]}
              onPress={() => setSelectedSport(sport.id)}
            >
              <Text style={[styles.sportChipText, selectedSport === sport.id && styles.sportChipTextActive]}>{sport.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>스팟 제목</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 토요일 오전 풋살 같이 해요!"
          value={form.title}
          onChangeText={v => setForm(f => ({ ...f, title: v }))}
          maxLength={50}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>상세 설명 (선택)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="운동 레벨, 준비물, 주의사항 등을 적어주세요"
          value={form.description}
          onChangeText={v => setForm(f => ({ ...f, description: v }))}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
      </View>

      {/* Step 2: 장소 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>장소 선택 (지도를 탭하세요)</Text>
        <TextInput
          style={styles.input}
          placeholder="장소명 (예: 서울숲 풋살장)"
          value={form.locationName}
          onChangeText={v => setForm(f => ({ ...f, locationName: v }))}
        />
        <View style={styles.mapContainer}>
          <NaverMapView
            style={styles.map}
            center={location ? { ...location, zoom: 14 } : { latitude: 37.5665, longitude: 126.9780, zoom: 12 }}
            onMapClick={(e) => setSelectedCoord({ latitude: e.latitude, longitude: e.longitude })}
          >
            {selectedCoord && <Marker coordinate={selectedCoord} pinColor={COLORS.primary} />}
          </NaverMapView>
        </View>
        {selectedCoord && (
          <Text style={styles.coordText}>
            선택된 위치: {selectedCoord.latitude.toFixed(5)}, {selectedCoord.longitude.toFixed(5)}
          </Text>
        )}
      </View>

      {/* Step 3: 시간 & 인원 */}
      <View style={styles.row}>
        <View style={[styles.section, styles.flex1]}>
          <Text style={styles.sectionTitle}>최대 인원</Text>
          <TextInput
            style={styles.input}
            value={form.maxParticipants}
            onChangeText={v => setForm(f => ({ ...f, maxParticipants: v }))}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={[styles.section, styles.flex2]}>
          <Text style={styles.sectionTitle}>시작 일시</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD HH:MM"
            value={form.startsAt}
            onChangeText={v => setForm(f => ({ ...f, startsAt: v }))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>난이도</Text>
        <View style={styles.diffRow}>
          {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.diffBtn, form.difficultyLevel === key && styles.diffBtnActive]}
              onPress={() => setForm(f => ({ ...f, difficultyLevel: key }))}
            >
              <Text style={[styles.diffBtnText, form.difficultyLevel === key && styles.diffBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Step 4: 태그 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>태그 선택 (최대 5개)</Text>
        <View style={styles.tagGrid}>
          {tags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={[styles.tagChip, selectedTags.includes(tag.id) && styles.tagChipActive]}
              onPress={() => { if (selectedTags.length < 5 || selectedTags.includes(tag.id)) toggleTag(tag.id); }}
            >
              <Text style={[styles.tagChipText, selectedTags.includes(tag.id) && styles.tagChipTextActive]}>{tag.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>스팟 만들기</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  section: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  input: { backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 100, textAlignVertical: 'top' },
  sportList: { marginBottom: 4 },
  sportChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  sportChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sportChipText: { fontSize: 13, color: COLORS.text },
  sportChipTextActive: { color: '#fff', fontWeight: '700' },
  mapContainer: { height: 200, borderRadius: 10, overflow: 'hidden', marginTop: 10 },
  map: { flex: 1 },
  coordText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  diffRow: { flexDirection: 'row', gap: 8 },
  diffBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  diffBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  diffBtnText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  diffBtnTextActive: { color: '#fff' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  tagChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tagChipText: { fontSize: 12, color: COLORS.textSecondary },
  tagChipTextActive: { color: '#fff', fontWeight: '600' },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
