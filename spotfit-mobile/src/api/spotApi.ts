import { apiClient } from './client';

export interface Spot {
  id: string;
  hostId: string;
  hostNickname: string;
  hostMannerScore: number;
  hostProfileImage: string | null;
  sportName: string;
  sportCategory: string;
  title: string;
  description: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  maxParticipants: number;
  currentParticipants: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  status: string;
  startsAt: string;
  distance: number | null;
  tags: { id: string; name: string }[];
  participants: { id: string; nickname: string; mannerScore: number; profileImage: string | null }[];
  createdAt: string;
}

export interface GetSpotsParams {
  lat?: number;
  lng?: number;
  radius?: number;
  sportId?: string;
  tagIds?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

export const spotsApi = {
  getSpots: (params: GetSpotsParams) =>
    apiClient.get<{ success: boolean; data: Spot[] }>('/spots', { params }),

  getSpotById: (id: string) =>
    apiClient.get<{ success: boolean; data: Spot }>(`/spots/${id}`),

  createSpot: (data: {
    sportId: string;
    title: string;
    description?: string;
    locationName: string;
    latitude: number;
    longitude: number;
    maxParticipants: number;
    difficultyLevel?: string;
    startsAt: string;
    tagIds?: string[];
  }) => apiClient.post<{ success: boolean; data: { spotId: string } }>('/spots', data),

  updateSpot: (id: string, data: Partial<{ title: string; description: string; maxParticipants: number; difficultyLevel: string; startsAt: string }>) =>
    apiClient.patch(`/spots/${id}`, data),

  cancelSpot: (id: string) => apiClient.delete(`/spots/${id}`),

  joinSpot: (id: string) =>
    apiClient.post<{ success: boolean; data: { currentParticipants: number; status: string } }>(`/spots/${id}/join`),

  leaveSpot: (id: string) => apiClient.delete(`/spots/${id}/join`),
};
