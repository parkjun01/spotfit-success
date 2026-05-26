import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    if (!sub) return error('활성 구독이 없습니다', 404);

    await supabaseAdmin.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id);
    await supabaseAdmin.from('users').update({
      subscription_status: 'expired',
      subscription_expires_at: new Date().toISOString(),
    }).eq('id', user.id);

    return ok(null);
  } catch (err) { return handleError(err); }
}
