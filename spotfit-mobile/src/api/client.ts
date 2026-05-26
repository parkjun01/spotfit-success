import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { access, refresh } = res.data.data;
        await AsyncStorage.multiSet([['access_token', access], ['refresh_token', refresh]]);
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      }
    }
    return Promise.reject(error);
  }
);
