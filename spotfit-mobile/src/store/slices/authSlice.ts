import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../api/authApi';

interface User {
  id: string;
  nickname: string;
  profileImage: string | null;
  activityRegion: string;
  mannerScore: number;
  subscriptionStatus: 'free' | 'premium' | 'expired';
  preferredSports: { id: string; name: string }[];
  badges: { id: string; name: string; imageUrl: string }[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const login = createAsyncThunk('auth/login', async (data: Parameters<typeof authApi.verifyPhone>[0]) => {
  const res = await authApi.verifyPhone(data);
  const { user, access, refresh } = res.data.data;
  await AsyncStorage.multiSet([['access_token', access], ['refresh_token', refresh]]);
  return user;
});

export const loadUser = createAsyncThunk('auth/loadUser', async () => {
  const { apiClient } = await import('../../api/client');
  const res = await apiClient.get('/users/me');
  return res.data.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '로그인 실패';
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loadUser.rejected, (state) => {
        state.isAuthenticated = false;
      });
  },
});

export const { logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
