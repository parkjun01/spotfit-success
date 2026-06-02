export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const p = req.nextUrl.searchParams;
    const type = p.get('type') || 'participated';
    const limit = parseInt(p.get('limit') || '20');
    const offset = parseInt(p.get('offset') || '0');

    if (type === 'hosted') {
      const { data, error } = await supabaseAdmin
        .from('spots')
        .select('*, sports(name)')
        .eq('host_id', user.id)
        .order('starts_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return ok(data);
    }

    const { data, error } = await supabaseAdmin
      .from('participations')
      .select('*, spots(*, sports(name), users!host_id(nickname, manner_score))')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return ok(data?.map(p => p.spots).filter(Boolean) || []);
  } catch (err) { return handleError(err); }
}
