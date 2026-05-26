import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import spotReducer from './slices/spotSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    spots: spotReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
