import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getAuthUser } from '@/lib/auth';
import { ok, created, error, handleError } from '@/lib/response';

// GET /api/spots — 주변 스팟 조회 (Supabase PostGIS RPC 사용)
export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const lat = parseFloat(p.get('lat') || '37.5665');
    const lng = parseFloat(p.get('lng') || '126.978');
    const radius = parseInt(p.get('radius') || '5000');
    const sportId = p.get('sportId');
    const tagIds = p.get('tagIds')?.split(',').filter(Boolean);
    const date = p.get('date');
    const limit = parseInt(p.get('limit') || '20');
    const offset = parseInt(p.get('offset') || '0');

    // Supabase RPC: 위치 기반 스팟 검색
    const { data, error: rpcErr } = await supabaseAdmin.rpc('get_nearby_spots', {
      user_lat: lat, user_lng: lng, radius_meters: radius,
      sport_filter: sportId || null,
      tag_filter: tagIds?.length ? tagIds : null,
      date_filter: date || null,
      page_limit: limit, page_offset: offset,
    });

    if (rpcErr) {
      // RPC 없을 경우 fallback: 기본 쿼리
      let query = supabaseAdmin
        .from('spots')
        .select(`*, sports(name,category), users!host_id(nickname,manner_score,profile_image), spot_tags(tags(id,name))`)
        .in('status', ['recruiting', 'full'])
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (sportId) query = query.eq('sport_id', sportId);
      if (date) query = query.gte('starts_at', `${date}T00:00:00`).lte('starts_at', `${date}T23:59:59`);

      const { data: spots, error: err2 } = await query;
      if (err2) throw err2;
      return ok(spots);
    }

    return ok(data);
  } catch (err) { return handleError(err); }
}

// POST /api/spots — 스팟 생성
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { sportId, title, description, locationName, latitude, longitude, maxParticipants, difficultyLevel, startsAt, tagIds = [] } = body;

    if (!sportId || !title || !locationName || !latitude || !longitude || !maxParticipants || !startsAt) {
      return error('필수 항목이 누락되었습니다');
    }

    const { data: spot, error: insertErr } = await supabaseAdmin
      .from('spots')
      .insert({
        host_id: user.id, sport_id: sportId, title, description,
        location_name: locationName, latitude, longitude,
        max_participants: maxParticipants,
        difficulty_level: difficultyLevel || 'beginner',
        starts_at: startsAt, current_participants: 1,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // 호스트 자동 참여
    await supabaseAdmin.from('participations').insert({ spot_id: spot.id, user_id: user.id });

    // 태그 연결
    if (tagIds.length) {
      await supabaseAdmin.from('spot_tags').insert(
        tagIds.map((tagId: string) => ({ spot_id: spot.id, tag_id: tagId }))
      );
    }

    return created({ spotId: spot.id });
  } catch (err) { return handleError(err); }
}
