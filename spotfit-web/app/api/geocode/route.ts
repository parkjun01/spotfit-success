import { NextRequest } from 'next/server';
import { ok, error, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address');
    if (!address) return error('address 파라미터가 필요합니다');

    // 카카오 REST API (우선)
    if (process.env.KAKAO_REST_API_KEY) {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`,
        { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } }
      );
      const data = await res.json();
      const doc = data.documents?.[0];
      if (doc) return ok({ lat: parseFloat(doc.y), lng: parseFloat(doc.x) });
    }

    return error('좌표를 찾을 수 없습니다', 404);
  } catch (err) { return handleError(err); }
}
