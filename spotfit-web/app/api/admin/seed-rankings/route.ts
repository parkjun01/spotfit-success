import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, handleError } from '@/lib/response';
import bcrypt from 'bcryptjs';

// 테스트 유저 데이터
const TEST_USERS = [
  { username: 'demo_runner01', nickname: '김민준', manner: 44.5, gender: 'male', age: 24 },
  { username: 'demo_player02', nickname: '이지은', manner: 41.2, gender: 'female', age: 22 },
  { username: 'demo_athlete03', nickname: '박서준', manner: 42.8, gender: 'male', age: 26 },
  { username: 'demo_sport04', nickname: '최유나', manner: 38.9, gender: 'female', age: 23 },
  { username: 'demo_crew05', nickname: '정현우', manner: 40.1, gender: 'male', age: 25 },
  { username: 'demo_fit06', nickname: '강다현', manner: 39.5, gender: 'female', age: 21 },
];

// 각 유저별 완료 스팟 수 (많을수록 높은 랭킹)
const SPOT_COUNTS = [6, 5, 4, 3, 3, 2];

export async function POST(req: NextRequest) {
  try {
    // 로그인 확인 (아무 유저나 호출 가능하게 하되, 토큰 필요)
    await requireAuth(req);

    const log: string[] = [];

    // 1. 스포츠 목록 가져오기
    const { data: sports } = await supabaseAdmin.from('sports').select('id, name').limit(5);
    if (!sports?.length) return ok({ log: ['스포츠 데이터 없음'] });
    log.push(`스포츠 ${sports.length}개 확인`);

    const createdUserIds: string[] = [];
    const demoPassword = await bcrypt.hash('demo1234!', 10);

    // 2. 테스트 유저 생성 (이미 있으면 기존 사용)
    for (const u of TEST_USERS) {
      const { data: existing } = await supabaseAdmin
        .from('users').select('id').eq('username', u.username).single();

      if (existing) {
        createdUserIds.push(existing.id);
        log.push(`기존 유저 사용: ${u.nickname}`);
        continue;
      }

      const { data: newUser, error } = await supabaseAdmin.from('users').insert({
        username: u.username,
        password_hash: demoPassword,
        nickname: u.nickname,
        manner_score: u.manner,
        gender: u.gender,
        age: u.age,
        email_verified: true,
        is_active: true,
      }).select('id').single();

      if (error) { log.push(`유저 생성 실패: ${u.nickname} - ${error.message}`); continue; }
      createdUserIds.push(newUser.id);
      log.push(`유저 생성: ${u.nickname}`);
    }

    // 3. 이번 주 날짜 계산
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    // 4. 각 유저별 완료된 참여 스팟 생성
    let spotIdx = 0;
    for (let i = 0; i < createdUserIds.length; i++) {
      const userId = createdUserIds[i];
      const count = SPOT_COUNTS[i] || 1;
      const sport = sports[i % sports.length];

      for (let j = 0; j < count; j++) {
        // 이번 주 내의 과거 날짜로 설정
        const spotDate = new Date(weekStart);
        spotDate.setDate(weekStart.getDate() + (j % 6));
        spotDate.setHours(16 + (j % 4), 0, 0, 0);
        if (spotDate >= now) spotDate.setDate(spotDate.getDate() - 1);

        // 완료된 스팟 직접 생성
        const { data: spot, error: spotErr } = await supabaseAdmin.from('spots').insert({
          host_id: userId,
          sport_id: sport.id,
          title: `시연용 ${sport.name} 스팟 ${spotIdx + 1}`,
          location_name: '충북대학교 개신캠퍼스',
          latitude: 36.6285 + (Math.random() - 0.5) * 0.01,
          longitude: 127.4566 + (Math.random() - 0.5) * 0.01,
          max_participants: 6,
          current_participants: 4,
          difficulty_level: 'beginner',
          starts_at: spotDate.toISOString(),
          status: 'completed',
        }).select('id').single();

        if (spotErr || !spot) { log.push(`스팟 생성 실패: ${spotErr?.message}`); continue; }

        // 참여 기록 생성
        await supabaseAdmin.from('participations').insert({
          spot_id: spot.id,
          user_id: userId,
          status: 'joined',
          evaluation_completed: true,
        }).throwOnError();

        spotIdx++;
      }
      log.push(`${TEST_USERS[i]?.nickname}: ${count}개 스팟 완료 처리`);
    }

    log.push(`\n완료! 총 ${spotIdx}개 완료 스팟 생성, ${createdUserIds.length}명 랭킹 등록`);
    return ok({ log, userCount: createdUserIds.length, spotCount: spotIdx });
  } catch (err) {
    return handleError(err);
  }
}

// 랭킹 시드 데이터 삭제
export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(req);

    const usernames = TEST_USERS.map(u => u.username);
    const { data: users } = await supabaseAdmin
      .from('users').select('id').in('username', usernames);

    if (!users?.length) return ok({ message: '삭제할 데이터 없음' });

    const ids = users.map(u => u.id);

    // 참여 기록 삭제
    await supabaseAdmin.from('participations').delete().in('user_id', ids);
    // 스팟 삭제
    await supabaseAdmin.from('spots').delete().in('host_id', ids);
    // 유저 삭제
    await supabaseAdmin.from('users').delete().in('id', ids);

    return ok({ message: `${ids.length}명 테스트 유저 및 관련 데이터 삭제 완료` });
  } catch (err) {
    return handleError(err);
  }
}
