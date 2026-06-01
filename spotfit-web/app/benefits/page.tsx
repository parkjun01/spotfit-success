'use client';
import { useState } from 'react';
import Link from 'next/link';

const BENEFITS = [
  { id: 1, category: 'GYM', brand: '짐박스 피트니스', logo: '🏋️', title: '전지점 1일권 할인', desc: '전국 짐박스 피트니스 전 지점 이용 가능. 스팟 참여 후 당일 사용.', discount: '50%', condition: '스팟 1회 이상 참여', borderColor: '#c9f236' },
  { id: 2, category: 'SUPPS', brand: 'Volt Nutrition', logo: '💊', title: '프로틴 쉐이크 첫 구매 할인', desc: '마이프로틴 공식몰 전 품목 적용. 1인 1회 사용 가능.', discount: '30%', condition: '매너점수 35점 이상', borderColor: '#fd591e' },
  { id: 3, category: 'GEAR', brand: '코트 프로', logo: '🎾', title: '테니스 코트 2시간 예약', desc: '전국 코트 프로 서울 전역 8개 지점. 스팟 완료 후 자동 발급.', discount: '40%', condition: '스팟 완료 시 자동 지급', borderColor: '#c9f236' },
  { id: 4, category: 'RECOVERY', brand: '리커버리 랩', logo: '🧘', title: '스포츠 마사지 1회 무료', desc: '강남 / 서초 지점 이용 가능. 프리미엄 전용 혜택.', discount: 'FREE', condition: '프리미엄 회원 전용', borderColor: '#7B5CF0', premium: true },
  { id: 5, category: 'FOOD', brand: '식스팩 키친', logo: '🍱', title: '밀프렙 도시락 정기 구독', desc: '전국 배송. 고단백 저칼로리 도시락 정기 배달 서비스.', discount: '25%', condition: '프리미엄 회원 전용', borderColor: '#c9f236', premium: true },
  { id: 6, category: 'GYM', brand: '애니타임피트니스', logo: '🏃', title: '1일 무료 이용권', desc: '애니타임피트니스 전 지점 1일 무료 입장. 월 2회 한정.', discount: '무료', condition: '스팟 5회 이상 참여', borderColor: '#fd591e' },
];

const CATEGORIES: { key: string; icon?: string }[] = [
  { key: 'ALL' },
  { key: 'GYM', icon: 'fitness_center' },
  { key: 'SUPPS', icon: 'medication' },
  { key: 'GEAR', icon: 'checkroom' },
  { key: 'RECOVERY', icon: 'spa' },
  { key: 'FOOD', icon: 'restaurant' },
];

const NAV = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/?view=map', icon: 'map', label: 'Explore' },
  { href: '/spots/new', icon: 'add_box', label: 'Host' },
  { href: '/ranking', icon: 'leaderboard', label: 'Ranks' },
  { href: '/benefits', icon: 'local_offer', label: '혜택', active: true },
];

export default function BenefitsPage() {
  const [category, setCategory] = useState('ALL');
  const [redeemedId, setRedeemedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filtered = category === 'ALL' ? BENEFITS : BENEFITS.filter(b => b.category === category);

  const handleRedeem = (b: typeof BENEFITS[0]) => {
    if (b.premium) {
      alert('프리미엄 회원 전용 혜택입니다.\n프리미엄으로 업그레이드하면 이용 가능합니다.');
      return;
    }
    setRedeemedId(b.id);
    setShowModal(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#131314', paddingBottom: 96 }}>

      {/* Top Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(19,19,20,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #2A2A32',
      }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', letterSpacing: '0.05em' }}>혜택</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e2e3' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>receipt_long</span>
          </button>
          <button style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e5e2e3' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </button>
        </div>
      </header>

      {/* Mini Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 16px 0' }}>
        <div style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(201,242,54,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#c9f236' }}>local_offer</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#e5e2e3', lineHeight: 1 }}>24</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>혜택</div>
          </div>
        </div>
        <div style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 16, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(253,89,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#fd591e' }}>bolt</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#e5e2e3', lineHeight: 1 }}>3</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, color: '#8A8A9A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>사용함</div>
          </div>
        </div>
      </div>

      {/* Premium Banner */}
      <div style={{
        margin: '16px 16px 0', borderRadius: 16, overflow: 'hidden', position: 'relative',
        background: 'linear-gradient(120deg,#1a1f00 0%,#0d1400 50%,#1a0a00 100%)',
        border: '1px solid rgba(201,242,54,0.3)', padding: 24,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, background: 'radial-gradient(circle,rgba(201,242,54,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(201,242,54,0.15)', border: '1px solid rgba(201,242,54,0.4)', width: 'fit-content' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#c9f236', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c9f236' }}>SPOTFIT PRO</span>
        </div>
        <div>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: '#c9f236', lineHeight: 0.95, textTransform: 'uppercase' }}>UNLOCK<br/>ALL PERKS</div>
          <p style={{ fontSize: 13, color: '#c5c9ae', lineHeight: 1.5, marginTop: 8 }}>프리미엄 회원에게만 제공되는<br/>독점 혜택을 경험하세요.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['파트너 브랜드 최대 50% 할인', '프리미엄 시설 우선 예약', '월 1회 1:1 퍼스널 트레이닝'].map(perk => (
            <div key={perk} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e5e2e3' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#c9f236', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12, color: '#171e00' }}>check</span>
              </div>
              {perk}
            </div>
          ))}
        </div>
        <Link href="/mypage/premium" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, background: '#c9f236', color: '#171e00', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.1em', maxWidth: 180 }}>
          업그레이드 →
        </Link>
      </div>

      {/* Category Filter — with icons (benefits.html) */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px', borderBottom: '1px solid #2A2A32' }} className="no-scrollbar">
        {CATEGORIES.map(c => {
          const active = category === c.key;
          return (
            <button key={c.key} onClick={() => setCategory(c.key)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 16px', borderRadius: 999,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              background: active ? '#c9f236' : '#1E1E22',
              color: active ? '#171e00' : '#8A8A9A',
              border: `1px solid ${active ? '#c9f236' : '#2A2A32'}`,
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {c.icon && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{c.icon}</span>}
              {c.key}
            </button>
          );
        })}
      </div>

      {/* Benefit Cards */}
      <div style={{ padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae' }}>🔥 지금 사용 가능</p>

        {filtered.filter(b => !b.premium).map(b => (
          <div key={b.id} style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderLeft: `3px solid ${b.borderColor}`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2a2a2b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{b.logo}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8A9A', marginBottom: 4 }}>{b.brand}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#e5e2e3', lineHeight: 1.3 }}>{b.title}</p>
              </div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: b.borderColor, lineHeight: 1, flexShrink: 0, textAlign: 'right' }}>{b.discount}</div>
            </div>
            <div style={{ padding: '8px 16px 16px', borderTop: '1px solid #2A2A32', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8A8A9A' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                {b.condition}
              </div>
              <button onClick={() => handleRedeem(b)} style={{
                padding: '7px 16px', background: '#c9f236', color: '#171e00',
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                borderRadius: 999, transition: 'all 0.2s', cursor: 'pointer', border: 'none', flexShrink: 0,
              }}>사용하기</button>
            </div>
          </div>
        ))}

        {filtered.some(b => b.premium) && (
          <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c5c9ae', marginTop: 8 }}>🔒 PRO 전용</p>
        )}

        {filtered.filter(b => b.premium).map(b => (
          <div key={b.id} style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderLeft: `3px solid ${b.borderColor}`, borderRadius: 16, overflow: 'hidden', opacity: 0.6, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: '1px solid #2A2A32', borderRadius: 999, padding: '3px 10px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, fontWeight: 700, color: '#8A8A9A', letterSpacing: '0.06em' }}>🔒 PRO</div>
            <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#2a2a2b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{b.logo}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A8A9A', marginBottom: 4 }}>{b.brand}</p>
                <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700, color: '#e5e2e3', lineHeight: 1.3 }}>{b.title}</p>
              </div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: b.borderColor, lineHeight: 1, flexShrink: 0, textAlign: 'right' }}>{b.discount}</div>
            </div>
            <div style={{ padding: '8px 16px 16px', borderTop: '1px solid #2A2A32', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#8A8A9A' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                {b.condition}
              </div>
              <button style={{ padding: '7px 16px', background: '#2a2a2b', color: '#8A8A9A', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', borderRadius: 999, border: 'none', cursor: 'default' }}>PRO 전용</button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 448, height: 68, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px',
        background: 'rgba(20,20,22,0.92)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid #2A2A32', borderRadius: '16px 16px 0 0',
      }}>
        {NAV.map(tab => (
          <Link key={tab.href} href={tab.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, color: (tab as any).active ? '#c9f236' : '#8A8A9A',
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '4px 8px', minWidth: 56, transition: 'color 0.2s',
            filter: (tab as any).active ? 'drop-shadow(0 0 6px rgba(201,242,54,0.35))' : 'none',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: (tab as any).active ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Redeem Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#141416', border: '1px solid #2A2A32', borderRadius: 20, padding: 32, maxWidth: 320, width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9f236', marginBottom: 8 }}>혜택 적용!</div>
            <p style={{ fontSize: 14, color: '#8A8A9A', marginBottom: 24, lineHeight: 1.6 }}>쿠폰 코드가 복사되었습니다.<br/>파트너 앱에서 사용하세요.</p>
            <div style={{ background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 10, padding: 12, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '0.12em', color: '#e5e2e3', marginBottom: 24 }}>SPOTFIT24</div>
            <button onClick={() => setShowModal(false)} style={{ width: '100%', height: 48, background: '#c9f236', color: '#171e00', borderRadius: 8, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 16, textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
}
