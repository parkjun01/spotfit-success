import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('id, name, classification')
      .order('classification', { ascending: true });
    if (error) throw error;
    return ok(data);
  } catch (err) { return handleError(err); }
}
