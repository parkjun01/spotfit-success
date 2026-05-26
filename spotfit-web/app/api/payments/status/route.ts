import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    const { data: u } = await supabaseAdmin
      .from('users')
      .select('subscription_status, subscription_expires_at')
      .eq('id', user.id)
      .single();

    return ok({
      subscriptionStatus: u?.subscription_status || 'free',
      expiresAt: u?.subscription_expires_at || null,
      currentPlan: sub?.plan_type || null,
    });
  } catch (err) { return handleError(err); }
}
