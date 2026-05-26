import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const p = req.nextUrl.searchParams;
    const type = p.get('type') || 'weekly';
    const sportId = p.get('sportId');

    const now = new Date();
    const periodStart = type === 'weekly'
      ? new Date(now.setDate(now.getDate() - now.getDay())).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let query = supabaseAdmin
      .from('participations')
      .select('*, spots!inner(sport_id, starts_at, status)')
      .eq('user_id', user.id)
      .eq('status', 'joined')
      .eq('spots.status', 'completed')
      .gte('spots.starts_at', periodStart);

    if (sportId) query = query.eq('spots.sport_id', sportId);

    const { data, error } = await query;
    if (error) throw error;

    const spotCount = data?.length || 0;
    const activityScore = spotCount * 10;

    return ok({ userId: user.id, spotCount, activityScore, period: type });
  } catch (err) { return handleError(err); }
}
