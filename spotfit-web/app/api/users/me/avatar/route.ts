import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return error('파일이 없습니다');
    if (file.size > 2 * 1024 * 1024) return error('파일 크기는 2MB 이하여야 합니다');
    if (!file.type.startsWith('image/')) return error('이미지 파일만 업로드할 수 있습니다');

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) throw uploadErr;

    const { data: publicData } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
    const publicUrl = `${publicData.publicUrl}?t=${Date.now()}`;

    await supabaseAdmin.from('users').update({ profile_image: publicUrl }).eq('id', user.id);

    return ok({ url: publicUrl });
  } catch (err) {
    return handleError(err);
  }
}
