import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { data, error } = await supabaseAdmin
      .from('participations')
      .select(`
        spot_id,
        evaluation_completed,
        spots!inner(id, title, starts_at, status,
          participations(user_id, status, users(id, nickname, profile_image))
        )
      `)
      .eq('user_id', user.id)
      .eq('evaluation_completed', false)
      .eq('spots.status', 'completed');
    if (error) throw error;
    return ok(data?.filter(p => p.spots) || []);
  } catch (err) { return handleError(err); }
}
