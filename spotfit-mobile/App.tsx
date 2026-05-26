import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import { apiClient } from './src/api/client';
import Toast from 'react-native-toast-message';

const requestNotificationPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const authStatus = await messaging().requestPermission();
  const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      apiClient.post('/auth/fcm-token', { fcmToken, deviceType: Platform.OS }).catch(() => {});
    }
  }
};

export default function App() {
  useEffect(() => {
    requestNotificationPermission();

    // 포그라운드 푸시 수신
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title || 'SpotFit',
        text2: remoteMessage.notification?.body,
        visibilityTime: 4000,
      });
    });

    return unsubscribe;
  }, []);

  return (
    <Provider store={store}>
      <AppNavigator />
      <Toast />
    </Provider>
  );
}
