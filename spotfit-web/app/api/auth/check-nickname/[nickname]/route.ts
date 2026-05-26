import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

export async function GET(_: NextRequest, { params }: { params: { nickname: string } }) {
  try {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('nickname', params.nickname)
      .single();
    return ok({ available: !data });
  } catch (err) { return handleError(err); }
}
