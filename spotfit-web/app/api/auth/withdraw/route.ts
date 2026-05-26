import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await supabaseAdmin.from('users').update({ is_active: false }).eq('id', user.id);
    return ok(null);
  } catch (err) { return handleError(err); }
}
