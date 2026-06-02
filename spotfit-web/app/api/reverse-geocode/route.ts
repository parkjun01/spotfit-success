export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { ok, error, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const lat = req.nextUrl.searchParams.get('lat');
    const lng = req.nextUrl.searchParams.get('lng');
    if (!lat || !lng) return error('lat, lng 파라미터가 필요합니다');

    // 1순위: Kakao REST API
    if (process.env.KAKAO_REST_API_KEY) {
      try {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
          { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } }
        );
        const data = await res.json();
        const doc = data.documents?.[0];
        if (doc) {
          const name = [doc.region_2depth_name, doc.region_3depth_name]
            .filter(Boolean).join(' ') || doc.region_1depth_name || '현재 위치';
          return ok({ name });
        }
      } catch {}
    }

    // 2순위: Nominatim (OpenStreetMap) — REST 키 없을 때 fallback
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ko`,
        { headers: { 'User-Agent': 'SpotFit/1.0' } }
      );
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const name = addr.suburb || addr.neighbourhood || addr.county || addr.city || addr.town || addr.village || '현재 위치';
        return ok({ name });
      }
    } catch {}

    return ok({ name: '현재 위치' });
  } catch (err) { return handleError(err); }
}
