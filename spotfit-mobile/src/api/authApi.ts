import { apiClient } from './client';

export const authApi = {
  verifyPhone: (data: { phoneToken: string; nickname?: string; preferredSports?: string[]; activityRegion?: string }) =>
    apiClient.post('/auth/verify-phone', data),

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),

  checkNickname: (nickname: string) =>
    apiClient.get<{ success: boolean; data: { available: boolean } }>(`/auth/check-nickname/${nickname}`),

  withdraw: () => apiClient.delete('/auth/withdraw'),

  saveFcmToken: (fcmToken: string, deviceType: 'ios' | 'android') =>
    apiClient.post('/auth/fcm-token', { fcmToken, deviceType }),
};

export const userApi = {
  getMe: () => apiClient.get('/users/me'),
  updateMe: (data: { nickname?: string; activityRegion?: string; profileImage?: string; preferredSports?: string[] }) =>
    apiClient.patch('/users/me', data),
  getMySpots: (type: 'participated' | 'hosted', limit?: number, offset?: number) =>
    apiClient.get('/users/me/spots', { params: { type, limit, offset } }),
  getUserProfile: (id: string) => apiClient.get(`/users/${id}`),
};

export const evaluationApi = {
  getPendingEvaluations: () => apiClient.get('/evaluations/pending'),
  submitEvaluation: (data: { spotId: string; evaluatedId: string; isPositive: boolean; scoreItems?: object }) =>
    apiClient.post('/evaluations', data),
  submitReport: (data: { reportedId: string; spotId?: string; reportType: string; description?: string }) =>
    apiClient.post('/reports', data),
};

export const rankingApi = {
  getRankings: (params: { type?: string; sportId?: string; region?: string; limit?: number }) =>
    apiClient.get('/rankings', { params }),
  getMyRanking: (params: { type?: string; sportId?: string }) =>
    apiClient.get('/rankings/me', { params }),
  getSports: () => apiClient.get('/sports'),
  getTags: () => apiClient.get('/tags'),
};

export const paymentApi = {
  getStatus: () => apiClient.get('/payments/status'),
  confirm: (data: { paymentKey: string; orderId: string; amount: number; planType: string }) =>
    apiClient.post('/payments/confirm', data),
  cancel: () => apiClient.post('/payments/cancel'),
};
