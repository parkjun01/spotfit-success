// Vercel 배포 URL (배포 후 실제 도메인으로 변경)
export const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://spotfit.vercel.app/api';

// Supabase Realtime 사용으로 Socket URL 불필요 (웹에서는 supabase.ts 직접 사용)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const MANNER_SCORE_THRESHOLD = 30;
export const DEFAULT_SEARCH_RADIUS = 5000; // 5km

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

export const STATUS_LABELS: Record<string, string> = {
  recruiting: '모집중',
  full: '마감',
  in_progress: '진행중',
  completed: '종료',
  cancelled: '취소',
};

export const NAVER_MAP_CLIENT_ID = 'YOUR_NAVER_MAP_CLIENT_ID';

export const COLORS = {
  primary: '#4F46E5',
  secondary: '#7C3AED',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  mannerHigh: '#10B981',
  mannerMid: '#F59E0B',
  mannerLow: '#EF4444',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};
