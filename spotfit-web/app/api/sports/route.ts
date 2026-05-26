import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sports').select('*').eq('is_active', true).order('category').order('name');
    if (error) throw error;
    return ok(data);
  } catch (err) { return handleError(err); }
}
