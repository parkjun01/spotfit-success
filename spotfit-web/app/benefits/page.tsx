'use client';
import { useState } from 'react';
import Link from 'next/link';

const BENEFITS = [
  {
    id: 1, category: '헬스장', tag: '제휴',
    brand: '스포애니', logo: '🏋️',
    title: '일일 입장권 20% 할인',
    desc: '전국 스포애니 전 지점 이용 가능. 스팟 참여 후 당일 사용.',
    discount: '20%',
    color: '#F97316',
    condition: '스팟 1회 이상 참여',
    codeLabel: '쿠폰 받기',
  },
  {
    id: 2, category: '보충제', tag: '독점',
    brand: '마이프로틴', logo: '💊',
    title: '전 품목 45% 할인 코드',
    desc: '마이프로틴 공식몰 전 품목 적용. 1인 1회 사용 가능.',
    discount: '45%',
    color: '#2563EB',
    condition: '매너점수 35점 이상',
    codeLabel: '코드 복사',
  },
  {
    id: 3, category: '카페', tag: '제휴',
    brand: '스타벅스', logo: '☕',
    title: '아이스 아메리카노 무료',
    desc: '월 3회 제공. 스팟 완료 시 쿠폰 자동 지급.',
    discount: '무료',
    color: '#15803D',
    condition: '이번 달 스팟 3회 완료',
    codeLabel: '쿠폰 확인',
  },
  {
    id: 4, category: '운동복', tag: '프리미엄',
    brand: '나이키', logo: '👟',
    title: '온라인 스토어 15% 할인',
    desc: '나이키 공식 온라인몰 전용 할인코드. 일부 세일 품목 제외.',
    discount: '15%',
    color: '#111827',
    condition: '프리미엄 회원 전용',
    codeLabel: '코드 받기',
    premium: true,
  },
  {
    id: 5, category: '헬스장', tag: '제휴',
    brand: '애니타임피트니스', logo: '🏃',
    title: '1일 무료 이용권',
    desc: '애니타임피트니스 전 지점 1일 무료 입장. 월 2회 한정.',
    discount: '무료',
    color: '#7C3AED',
    condition: '스팟 5회 이상 참여',
    codeLabel: '이용권 받기',
  },
  {
    id: 6, category: '음료', tag: '제휴',
    brand: '게토레이', logo: '🥤',
    title: '스포츠음료 3+1 쿠폰',
    desc: '편의점 3캔 구매 시 1캔 무료. 스팟 완료 후 자동 발급.',
    discount: '3+1',
    color: '#EA580C',
    condition: '스팟 완료 시 자동 지급',
    codeLabel: '쿠폰 받기',
  },
];

const CATEGORIES = ['전체', '헬스장', '보충제', '카페', '운동복', '음료'];

export default function BenefitsPage() {
  const [category, setCategory] = useState('전체');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = category === '전체' ? BENEFITS : BENEFITS.filter(b => b.category === category);

  const handleCoupon = (b: typeof BENEFITS[0]) => {
    if (b.premium) {
      alert('프리미엄 회원 전용 혜택입니다.\n프리미엄으로 업그레이드하면 이용 가능합니다.');
      return;
    }
    setCopiedId(b.id);
    setTimeout(() => setCopiedId(null), 2000);
    alert(`${b.brand} 혜택이 지급되었습니다!\n\n${b.title}\n\n실제 서비스에서는 쿠폰/코드가 자동 발급됩니다.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-gray-900">혜택 <span className="text-primary">센터</span></h1>
        <p className="text-xs text-gray-400 mt-0.5">스팟 활동으로 다양한 할인 혜택을 받으세요</p>
      </header>

      {/* 프리미엄 배너 */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-lg">👑 프리미엄 멤버</p>
            <p className="text-orange-100 text-xs mt-0.5">독점 혜택 + 모든 쿠폰 2배</p>
          </div>
          <Link href="/mypage/premium"
            className="bg-white text-primary font-extrabold px-4 py-2 rounded-xl text-sm active:scale-95 transition-transform">
            업그레이드
          </Link>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${
              category === c ? 'bg-primary text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 혜택 카드 목록 */}
      <div className="px-4 space-y-3">
        {filtered.map(b => (
          <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-1" style={{ background: b.color }} />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${b.color}15` }}
                >
                  {b.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: b.color }}>
                      {b.category}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      b.tag === '프리미엄' ? 'bg-amber-100 text-amber-700' :
                      b.tag === '독점' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {b.tag === '프리미엄' ? '👑 ' : ''}{b.tag}
                    </span>
                  </div>
                  <p className="font-extrabold text-gray-900 text-sm">{b.brand}</p>
                  <p className="font-bold text-base" style={{ color: b.color }}>{b.title}</p>
                </div>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-lg flex-shrink-0"
                  style={{ background: `${b.color}15`, color: b.color }}
                >
                  {b.discount}
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">{b.desc}</p>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">🔑</span>
                  <span className="text-xs text-gray-400 font-medium">{b.condition}</span>
                </div>
                <button
                  onClick={() => handleCoupon(b)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                    b.premium
                      ? 'bg-amber-100 text-amber-700'
                      : copiedId === b.id
                      ? 'bg-emerald-500 text-white'
                      : 'text-white'
                  }`}
                  style={!b.premium && copiedId !== b.id ? { background: b.color } : {}}
                >
                  {b.premium ? '👑 프리미엄' : copiedId === b.id ? '✓ 완료!' : b.codeLabel}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 탭 */}
      <BottomNav active="benefits" />
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
  const tabs = [
    { href: '/', key: 'home', icon: <MapIcon />, label: '스팟' },
    { href: '/benefits', key: 'benefits', icon: <GiftIcon />, label: '혜택' },
    { href: '/ranking', key: 'ranking', icon: <TrophyIcon />, label: '랭킹' },
    { href: '/mypage', key: 'mypage', icon: <UserIcon />, label: '마이' },
  ];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-20">
      {tabs.map(t => (
        <Link key={t.key} href={t.href}
          className={`flex-1 flex flex-col items-center py-2.5 transition-colors ${active === t.key ? 'text-primary' : 'text-gray-300 hover:text-gray-400'}`}>
          <div className="w-6 h-6">{t.icon}</div>
          <span className="text-xs mt-0.5 font-semibold">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MapIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>; }
function GiftIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>; }
function TrophyIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>; }
function UserIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>; }
