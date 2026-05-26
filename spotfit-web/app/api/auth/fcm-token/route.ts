import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { fcmToken, deviceType } = await req.json();
    await supabaseAdmin.from('notification_tokens').upsert(
      { user_id: user.id, fcm_token: fcmToken, device_type: deviceType, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    return ok(null);
  } catch (err) { return handleError(err); }
}
