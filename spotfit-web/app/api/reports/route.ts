import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { created, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { reportedId, spotId, reportType, description } = await req.json();

    if (!reportedId || !reportType) return error('신고 대상과 신고 유형을 입력해주세요');
    if (reportedId === user.id) return error('자신을 신고할 수 없습니다');

    const { error: insertErr } = await supabaseAdmin.from('reports').insert({
      reporter_id: user.id,
      reported_id: reportedId,
      spot_id: spotId || null,
      report_type: reportType,
      description: description || null,
    });
    if (insertErr) throw insertErr;
    return created(null);
  } catch (err) { return handleError(err); }
}
