import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

export async function GET(_: NextRequest, { params }: { params: { username: string } }) {
  try {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', params.username)
      .single();
    return ok({ available: !data });
  } catch (err) { return handleError(err); }
}
