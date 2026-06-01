export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { ok, error, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const lat = req.nextUrl.searchParams.get('lat');
    const lng = req.nextUrl.searchParams.get('lng');
    if (!lat || !lng) return error('lat, lng 파라미터가 필요합니다');

    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } }
    );
    const data = await res.json();
    const doc = data.documents?.[0];
    if (!doc) return error('주소를 찾을 수 없습니다', 404);

    const name = [doc.region_2depth_name, doc.region_3depth_name]
      .filter(Boolean).join(' ') || doc.region_1depth_name || '현재 위치';

    return ok({ name });
  } catch (err) { return handleError(err); }
}
