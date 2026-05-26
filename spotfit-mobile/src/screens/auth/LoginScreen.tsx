import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store/store';
import { login } from '../../store/slices/authSlice';
import { COLORS } from '../../utils/constants';

export const LoginScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((s: RootState) => s.auth);
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState<'phone' | 'nickname'>('phone');

  const handlePhoneVerify = () => {
    if (phone.length < 10) { Alert.alert('오류', '올바른 전화번호를 입력해주세요'); return; }
    // 실제 앱: PASS 인증 앱 호출 → 토큰 반환
    // 개발 환경: 전화번호를 토큰으로 사용
    setStep('nickname');
  };

  const handleLogin = async () => {
    try {
      await dispatch(login({ phoneToken: phone, nickname: nickname || undefined })).unwrap();
    } catch (err: any) {
      Alert.alert('로그인 오류', err.message || '다시 시도해주세요');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoSection}>
          <Text style={styles.logo}>SpotFit</Text>
          <Text style={styles.tagline}>운동 파티를 찾는 가장 빠른 방법</Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={styles.label}>전화번호</Text>
            <TextInput
              style={styles.input}
              placeholder="010-0000-0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={13}
            />
            <TouchableOpacity style={styles.btn} onPress={handlePhoneVerify}>
              <Text style={styles.btnText}>인증하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>닉네임 (처음 이용하시는 경우)</Text>
            <TextInput
              style={styles.input}
              placeholder="닉네임을 입력하세요 (기존 사용자는 비워두세요)"
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
            />
            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>시작하기</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.backText}>← 이전으로</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.terms}>
          시작하면 <Text style={styles.termsLink}>이용약관</Text> 및{' '}
          <Text style={styles.termsLink}>개인정보 처리방침</Text>에 동의합니다
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoSection: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 42, fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  tagline: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8 },
  form: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, gap: 14 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input: { backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  backText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14, paddingTop: 4 },
  terms: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 24, lineHeight: 18 },
  termsLink: { color: COLORS.primary, textDecorationLine: 'underline' },
});
