import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

export async function GET() {
  try {
    const [
      usersRes,
      spotsRes,
      noShowRes,
      mannerRes,
      recentNoShowRes,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('id, manner_score, created_at', { count: 'exact' }),
      supabaseAdmin.from('spots').select('id, status, created_at', { count: 'exact' }),
      supabaseAdmin
        .from('participations')
        .select('id, user_id', { count: 'exact' })
        .eq('status', 'no_show'),
      supabaseAdmin.from('users').select('manner_score'),
      supabaseAdmin
        .from('participations')
        .select('user_id, updated_at')
        .eq('status', 'no_show')
        .order('updated_at', { ascending: false })
        .limit(5),
    ]);

    const users = usersRes.data || [];
    const spots = spotsRes.data || [];
    const mannerUsers = mannerRes.data || [];

    // 스팟 상태별 집계
    const spotsByStatus = {
      recruiting: spots.filter(s => s.status === 'recruiting').length,
      full: spots.filter(s => s.status === 'full').length,
      in_progress: spots.filter(s => s.status === 'in_progress').length,
      completed: spots.filter(s => s.status === 'completed').length,
      cancelled: spots.filter(s => s.status === 'cancelled').length,
    };

    // 매너점수 분포
    const mannerDist = {
      green: mannerUsers.filter(u => parseFloat(u.manner_score) >= 38).length,
      yellow: mannerUsers.filter(u => {
        const s = parseFloat(u.manner_score);
        return s >= 30 && s < 38;
      }).length,
      red: mannerUsers.filter(u => parseFloat(u.manner_score) < 30).length,
    };

    // 이번 주 신규 가입자
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = users.filter(u =>
      new Date(u.created_at) >= weekAgo
    ).length;

    // 이번 주 생성된 스팟
    const newSpotsThisWeek = spots.filter(s =>
      new Date(s.created_at) >= weekAgo
    ).length;

    return ok({
      users: {
        total: usersRes.count ?? users.length,
        new_this_week: newUsersThisWeek,
      },
      spots: {
        total: spotsRes.count ?? spots.length,
        new_this_week: newSpotsThisWeek,
        by_status: spotsByStatus,
      },
      no_show: {
        total: noShowRes.count ?? 0,
        recent: recentNoShowRes.data || [],
      },
      manner_distribution: mannerDist,
    });
  } catch (err) {
    return handleError(err);
  }
}
