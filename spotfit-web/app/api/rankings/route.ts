export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const type = p.get('type') || 'weekly';
    const sportId = p.get('sportId');
    const limit = parseInt(p.get('limit') || '50');

    const now = new Date();
    const periodStart = type === 'weekly'
      ? new Date(now.setDate(now.getDate() - now.getDay())).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Supabase RPC로 랭킹 집계
    const { data, error } = await supabaseAdmin.rpc('get_rankings', {
      period_type: type,
      period_start: periodStart,
      sport_filter: sportId || null,
      page_limit: limit,
    });

    if (error) {
      // fallback: 직접 쿼리
      const { data: fallback } = await supabaseAdmin
        .from('participations')
        .select(`user_id, users(id, nickname, profile_image, manner_score), spots!inner(sport_id, starts_at, status)`)
        .eq('spots.status', 'completed')
        .gte('spots.starts_at', periodStart)
        .eq('status', 'joined')
        .limit(500);

      // 집계
      const scoreMap: Record<string, any> = {};
      for (const p of fallback || []) {
        const u = (p as any).users;
        if (!u) continue;
        if (sportId && (p as any).spots?.sport_id !== sportId) continue;
        if (!scoreMap[u.id]) scoreMap[u.id] = { ...u, activityScore: 0, spotCount: 0 };
        scoreMap[u.id].activityScore += 10;
        scoreMap[u.id].spotCount += 1;
      }
      const ranked = Object.values(scoreMap)
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, limit)
        .map((u, i) => ({ ...u, rankPosition: i + 1 }));
      return ok(ranked);
    }

    return ok(data);
  } catch (err) { return handleError(err); }
}
