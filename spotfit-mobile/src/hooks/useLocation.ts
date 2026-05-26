import { useState, useEffect } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';

interface Location {
  latitude: number;
  longitude: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      setError('위치 권한이 필요합니다');
      setLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(`위치를 가져올 수 없습니다: ${err.message}`);
        setLoading(false);
        // 서울 시청 기본값
        setLocation({ latitude: 37.5665, longitude: 126.9780 });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return { location, error, loading, refresh: getCurrentLocation };
};
