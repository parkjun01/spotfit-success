export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const type = p.get('type') || 'weekly';
    const sportId = p.get('sportId');
    const region = p.get('region'); // 지역 필터 (예: "충북", "서울")
    const limit = parseInt(p.get('limit') || '50');

    const now = new Date();
    const periodStart = type === 'weekly'
      ? new Date(now.setDate(now.getDate() - now.getDay())).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 지역 필터 없을 때만 RPC 사용 (RPC는 activity_region 반환 안 함)
    if (!region) {
      const { data, error } = await supabaseAdmin.rpc('get_rankings', {
        period_type: type,
        period_start: periodStart,
        sport_filter: sportId || null,
        page_limit: limit,
      });
      if (!error) return ok(data);
    }

    // 직접 쿼리 (지역 필터 or RPC 실패 시 fallback)
    const { data: fallback } = await supabaseAdmin
      .from('participations')
      .select(`user_id, users!inner(id, nickname, profile_image, manner_score, activity_region, subscription_status), spots!inner(sport_id, starts_at, status)`)
      .eq('spots.status', 'completed')
      .gte('spots.starts_at', periodStart)
      .eq('status', 'joined')
      .limit(500);

    const scoreMap: Record<string, any> = {};
    for (const row of fallback || []) {
      const u = (row as any).users;
      if (!u) continue;
      if (sportId && (row as any).spots?.sport_id !== sportId) continue;
      if (region && !u.activity_region?.includes(region)) continue;
      if (!scoreMap[u.id]) scoreMap[u.id] = { ...u, activityScore: 0, spotCount: 0 };
      scoreMap[u.id].activityScore += 10;
      scoreMap[u.id].spotCount += 1;
    }
    const ranked = Object.values(scoreMap)
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, limit)
      .map((u, i) => ({ ...u, rankPosition: i + 1 }));
    return ok(ranked);
  } catch (err) { return handleError(err); }
}
