export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { ok, error, handleError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get('address');
    if (!address) return error('address 파라미터가 필요합니다');

    const key = process.env.KAKAO_REST_API_KEY || process.env.Default_Rest_API_Key;
    if (key) {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}&size=1`,
        { headers: { Authorization: `KakaoAK ${key}` } }
      );
      const data = await res.json();
      const doc = data.documents?.[0];
      if (doc) return ok({ lat: parseFloat(doc.y), lng: parseFloat(doc.x) });

      // 키워드 검색 실패 시 주소 검색으로 재시도
      const res2 = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`,
        { headers: { Authorization: `KakaoAK ${key}` } }
      );
      const data2 = await res2.json();
      const doc2 = data2.documents?.[0];
      if (doc2) return ok({ lat: parseFloat(doc2.y), lng: parseFloat(doc2.x) });
    }

    return error('좌표를 찾을 수 없습니다', 404);
  } catch (err) { return handleError(err); }
}
