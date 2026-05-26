import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 브라우저/서버 공용 클라이언트 (anon key - RLS 적용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 전용 클라이언트 (service role key - RLS 우회, API Routes에서만 사용)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
