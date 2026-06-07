export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ok, handleError } from '@/lib/response';

// GET /api/benchmark — NFR 성능 지표 자동 측정
// 논문 NFR-01(스팟 검색 3초 이내), NFR-02(채팅 전달 3초 이내) 증빙용
export async function GET(req: NextRequest) {
  try {
    const results: Record<string, any> = {};

    // ── 1. 스팟 검색 응답시간 (NFR-01) ─────────────────────────
    const t1 = Date.now();
    await supabaseAdmin.rpc('get_nearby_spots', {
      user_lat: 37.5665, user_lng: 126.978,
      radius_meters: 5000,
      sport_filter: null, tag_filter: null, date_filter: null,
      page_limit: 20, page_offset: 0,
    });
    results.spot_search_ms = Date.now() - t1;

    // ── 2. 단순 DB 조회 응답시간 ────────────────────────────────
    const t2 = Date.now();
    await supabaseAdmin.from('sports').select('id, name').limit(20);
    results.sports_query_ms = Date.now() - t2;

    // ── 3. 채팅 메시지 조회 응답시간 (NFR-02 참고) ──────────────
    const t3 = Date.now();
    await supabaseAdmin.from('chat_messages').select('id').limit(50).order('created_at', { ascending: false });
    results.chat_query_ms = Date.now() - t3;

    // ── 4. 총 데이터 현황 ────────────────────────────────────────
    const [spotsRes, usersRes, msgsRes] = await Promise.all([
      supabaseAdmin.from('spots').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }),
    ]);

    results.total_spots   = spotsRes.count ?? 0;
    results.total_users   = usersRes.count ?? 0;
    results.total_messages = msgsRes.count ?? 0;

    // ── 5. NFR 달성 여부 판정 ────────────────────────────────────
    results.nfr01_pass = results.spot_search_ms < 3000;   // 스팟 검색 3초 이내
    results.nfr02_ref  = results.chat_query_ms;            // 채팅 조회 참고값

    // ── 6. 태스크 클릭 수 분석 (정적 분석 결과) ─────────────────
    results.task_analysis = [
      { task: '스팟 검색 (현재위치 자동)', clicks: 0, steps: 1, note: '앱 실행 시 자동 감지' },
      { task: '스팟 상세 보기', clicks: 1, steps: 2, note: '목록 → 상세' },
      { task: '스팟 참가 신청', clicks: 2, steps: 3, note: '상세 → JOIN → 완료' },
      { task: '스팟 생성', clicks: 1, steps: 8, note: '폼 작성 후 제출 1회' },
      { task: '스팟 완료 후 평가', clicks: 3, steps: 4, note: '긍정/부정 선택 → 제출' },
      { task: '랭킹 확인', clicks: 1, steps: 1, note: '하단 탭 1회' },
    ];

    results.measured_at = new Date().toISOString();

    return ok(results);
  } catch (err) { return handleError(err); }
}
