'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FEATURES = [
  {
    icon: 'local_offer',
    color: '#c9f236',
    title: '모든 혜택 잠금 해제',
    desc: '파트너 브랜드 최대 50% 할인, PRO 전용 쿠폰 무제한',
  },
  {
    icon: 'bolt',
    color: '#fd591e',
    title: '스팟 우선 참여권',
    desc: '마감 30분 전 자동 알림 + 일반 참여자보다 먼저 자리 확보',
  },
  {
    icon: 'workspace_premium',
    color: '#c9f236',
    title: '프리미엄 뱃지',
    desc: '프로필과 채팅에 👑 PRO 뱃지 표시 — 신뢰도 즉시 상승',
  },
  {
    icon: 'insights',
    color: '#22C55E',
    title: '상세 운동 통계',
    desc: '참여 히스토리, 종목별 활동량, 매너점수 변동 그래프',
  },
  {
    icon: 'auto_awesome',
    color: '#c9f236',
    title: 'AI 맞춤 스팟 추천',
    desc: '취향 · 실력 · 위치 기반으로 딱 맞는 스팟만 큐레이션',
  },
  {
    icon: 'emoji_events',
    color: '#fd591e',
    title: 'PRO 전용 리그',
    desc: '매 시즌 프리미엄 회원 전용 토너먼트 — 상위 입상 시 상품 증정',
  },
  {
    icon: 'self_improvement',
    color: '#22C55E',
    title: '월 1회 퍼스널 트레이닝',
    desc: '제휴 트레이너와 1:1 PT 세션 쿠폰 매월 자동 지급',
  },
  {
    icon: 'support_agent',
    color: '#c9f236',
    title: '프리미엄 고객 지원',
    desc: '일반 대기 없이 전담 팀이 24시간 내 응답 보장',
  },
];

const FAQS = [
  { q: '언제든지 해지할 수 있나요?', a: '네, 언제든지 앱 내에서 즉시 해지할 수 있습니다. 해지 후에도 결제 기간 만료일까지 PRO 혜택을 계속 이용할 수 있습니다.' },
  { q: '연간 구독은 언제 청구되나요?', a: '구독 시작 시 전액이 한 번에 청구됩니다. 이후 매년 같은 날짜에 자동 갱신됩니다.' },
  { q: '환불이 가능한가요?', a: '결제 후 7일 이내에는 전액 환불이 가능합니다. 7일 이후에는 남은 기간에 비례한 부분 환불이 가능합니다.' },
  { q: '여러 기기에서 사용할 수 있나요?', a: '하나의 계정으로 모바일과 웹 모든 기기에서 동시에 사용 가능합니다.' },
];

export default function PremiumPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const monthlyPrice = 9900;
  const annualPrice = 79900;
  const annualMonthly = Math.round(annualPrice / 12);
  const savings = Math.round((1 - annualMonthly / monthlyPrice) * 100);

  const handleSubscribe = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    alert('현재 결제 시스템 연동 준비 중입니다.\n곧 서비스 예정입니다!');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0B', paddingBottom: 100 }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2A2A32',
      }}>
        <button onClick={() => router.back()} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9f236', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#c9f236', letterSpacing: '0.06em' }}>SPOTFIT PRO</span>
        <div style={{ width: 40 }} />
      </header>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '48px 16px 40px', background: 'linear-gradient(160deg,#1a2200 0%,#0a0a0b 60%)', textAlign: 'center' }}>
        {/* Decorative glows */}
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 320, height: 320, background: 'radial-gradient(circle,rgba(201,242,54,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle,rgba(253,89,30,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 16px', borderRadius: 999, background: 'rgba(201,242,54,0.12)', border: '1px solid rgba(201,242,54,0.4)', marginBottom: 20 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#c9f236', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c9f236' }}>LIMITED OFFER</span>
        </div>

        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 58, lineHeight: 0.92, color: '#c9f236', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 16 }}>
          UNLOCK<br/><span style={{ color: '#ffffef' }}>FULL</span><br/>POTENTIAL
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A9A', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
          스포츠 크루의 최상위 경험.<br/>프리미엄 회원만의 독점 혜택을 누리세요.
        </p>

        {/* Social proof */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 28 }}>
          {[
            { value: '12K+', label: 'PRO 회원' },
            { value: '98%', label: '만족도' },
            { value: '4.9', label: '앱 평점' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', lineHeight: 1 }}>{value}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8A9A', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plan Toggle */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ display: 'flex', background: '#141416', border: '1px solid #2A2A32', borderRadius: 14, padding: 4, gap: 4 }}>
          {(['monthly', 'annual'] as const).map(p => (
            <button key={p} onClick={() => setPlan(p)} style={{
              flex: 1, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              background: plan === p ? '#c9f236' : 'transparent',
              color: plan === p ? '#171e00' : '#8A8A9A',
              transition: 'all 0.2s', position: 'relative',
            }}>
              {p === 'monthly' ? '월간' : '연간'}
              {p === 'annual' && (
                <span style={{ position: 'absolute', top: -8, right: 8, background: '#fd591e', color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' }}>
                  -{savings}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price Card */}
      <div style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg,#1a2200,#141416)', border: '1px solid rgba(201,242,54,0.3)', borderRadius: 20, padding: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: 'radial-gradient(circle,rgba(201,242,54,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 52, color: '#c9f236', lineHeight: 1 }}>
            ₩{plan === 'monthly' ? monthlyPrice.toLocaleString() : annualMonthly.toLocaleString()}
          </span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 600, color: '#8A8A9A', paddingBottom: 6 }}>/월</span>
        </div>
        {plan === 'annual' && (
          <>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#8A8A9A' }}>
              연간 결제 시 <span style={{ color: '#c9f236', fontWeight: 700 }}>₩{annualPrice.toLocaleString()}</span> · 월 ₩{monthlyPrice.toLocaleString()} 대비 {savings}% 절약
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#22C55E' }}>check_circle</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, color: '#22C55E' }}>연간 구독으로 ₩{(monthlyPrice * 12 - annualPrice).toLocaleString()} 절약!</span>
            </div>
          </>
        )}
        {plan === 'monthly' && (
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#8A8A9A' }}>
            매월 자동 갱신 · 언제든지 해지 가능
          </p>
        )}
      </div>

      {/* Features */}
      <div style={{ padding: '28px 16px 0' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae', marginBottom: 16 }}>PRO 전용 혜택</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: '14px 16px', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,242,54,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2A2A32')}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: f.color, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#ffffef', marginBottom: 3 }}>{f.title}</p>
                <p style={{ fontSize: 13, color: '#8A8A9A', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#c9f236', flexShrink: 0, marginTop: 2 }}>check</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compare Plans */}
      <div style={{ margin: '28px 16px 0', background: '#141416', border: '1px solid #2A2A32', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #2A2A32' }}>
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae' }}>플랜 비교</p>
        </div>
        {[
          { feature: '스팟 참여', free: '✓', pro: '✓ 우선 참여' },
          { feature: '파트너 혜택', free: '일부', pro: '전체 + 추가 할인' },
          { feature: '랭킹 참여', free: '기본 랭킹', pro: '기본 + PRO 리그' },
          { feature: '통계/분석', free: '기본', pro: '상세 그래프' },
          { feature: '스팟 추천', free: '위치 기반', pro: 'AI 맞춤 추천' },
          { feature: '퍼스널 트레이닝', free: '✕', pro: '월 1회 무료' },
          { feature: '프리미엄 뱃지', free: '✕', pro: '👑 PRO 뱃지' },
          { feature: '고객 지원', free: '일반', pro: '전담 24h' },
        ].map(({ feature, free, pro }) => (
          <div key={feature} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '12px 16px', borderBottom: '1px solid #1E1E22', alignItems: 'center' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A' }}>{feature}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#3E3E4A', textAlign: 'center' }}>{free}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 700, color: '#c9f236', textAlign: 'center' }}>{pro}</span>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '10px 16px', background: '#1E1E22' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color: '#8A8A9A', textTransform: 'uppercase' }}>기능</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color: '#3E3E4A', textAlign: 'center', textTransform: 'uppercase' }}>FREE</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, color: '#c9f236', textAlign: 'center', textTransform: 'uppercase' }}>PRO</span>
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ padding: '28px 16px 0' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae', marginBottom: 16 }}>PRO 회원 후기</p>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }} className="no-scrollbar">
          {[
            { name: '김지연', sport: '농구', text: '우선 참여권 덕분에 인기 스팟 한 번도 못 들어간 적 없어요. 완전 갓벽.', score: 5 },
            { name: '박민수', sport: '헬스', text: 'AI 추천이 진짜 잘 돼요. 실력이랑 거리 딱 맞는 스팟만 뜨더라고요.', score: 5 },
            { name: '이서현', sport: '테니스', text: 'PRO 리그에서 우승했어요 🏆 상금도 받고 짱 재밌었습니다.', score: 5 },
          ].map((t, i) => (
            <div key={i} style={{ minWidth: 260, background: '#141416', border: '1px solid #2A2A32', borderRadius: 16, padding: 16, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#c9f236', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#171e00' }}>
                  {t.name[0]}
                </div>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, color: '#e5e2e3' }}>{t.name}</p>
                  <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A', textTransform: 'uppercase' }}>{t.sport} · PRO 회원</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#c5c9ae', lineHeight: 1.6 }}>"{t.text}"</p>
              <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
                {Array(t.score).fill(null).map((_, j) => (
                  <span key={j} className="material-symbols-outlined" style={{ fontSize: 14, color: '#c9f236', fontVariationSettings: "'FILL' 1" }}>star</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ padding: '28px 16px 0' }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae', marginBottom: 16 }}>자주 묻는 질문</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 14, overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700, color: '#e5e2e3', flex: 1 }}>{faq.q}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#8A8A9A', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 16px 16px' }}>
                  <p style={{ fontSize: 14, color: '#8A8A9A', lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legal */}
      <p style={{ textAlign: 'center', padding: '24px 16px 0', fontSize: 11, color: '#3E3E4A', lineHeight: 1.6 }}>
        구독은 자동으로 갱신됩니다. 갱신 24시간 전에 해지하지 않으면<br/>다음 결제 주기 요금이 청구됩니다.
        <br/>구독 관리는 마이페이지 → 구독 관리에서 언제든 가능합니다.
      </p>

      {/* Sticky Bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, zIndex: 50,
        padding: '12px 16px 20px',
        background: 'rgba(10,10,11,0.95)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid #2A2A32',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: '#c9f236' }}>
              ₩{plan === 'monthly' ? monthlyPrice.toLocaleString() : annualMonthly.toLocaleString()}
            </span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, color: '#8A8A9A' }}>/월 {plan === 'annual' && `· 연 ₩${annualPrice.toLocaleString()} 일괄 결제`}</span>
          </div>
          {plan === 'annual' && (
            <span style={{ background: '#fd591e', color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em' }}>
              -{savings}% 절약
            </span>
          )}
        </div>
        <button onClick={handleSubscribe} disabled={loading} style={{
          width: '100%', height: 54, borderRadius: 12,
          background: loading ? '#2a2a2b' : '#c9f236',
          color: loading ? '#8A8A9A' : '#171e00',
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          border: 'none', cursor: loading ? 'default' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: loading ? 'none' : '0 0 24px rgba(201,242,54,0.25)',
        }}>
          {loading ? (
            <>
              <div style={{ width: 18, height: 18, border: '2px solid #8A8A9A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              처리 중...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              PRO 시작하기
            </>
          )}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#3E3E4A', marginTop: 8 }}>
          7일 무료 체험 · 언제든지 해지 가능
        </p>
      </div>
    </div>
  );
}
