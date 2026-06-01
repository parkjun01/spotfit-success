'use client';

declare global {
  interface Window { daum: any; }
}

export interface AddressResult {
  address: string;
  zonecode: string;
  sido: string;
  sigungu: string;
  lat?: number;
  lng?: number;
}

interface Props {
  value: string;
  onChange: (result: AddressResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    const data = await res.json();
    if (data.success) return { lat: data.data.lat, lng: data.data.lng };
  } catch {}
  return null;
}

export default function AddressSearch({ value, onChange, placeholder = '주소 검색', label, required }: Props) {
  const openSearch = () => {
    if (!window.daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: async (data: any) => {
        const address = data.roadAddress || data.jibunAddress;
        const coords = await geocode(address);
        onChange({ address, zonecode: data.zonecode, sido: data.sido, sigungu: data.sigungu, lat: coords?.lat, lng: coords?.lng });
      },
      theme: { bgColor: '#131314', searchBgColor: '#1E1E22', queryTextColor: '#c9f236' },
    }).open();
  };

  return (
    <div>
      {label && (
        <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input flex-1"
          value={value}
          placeholder={placeholder}
          readOnly
          onClick={openSearch}
          style={{ cursor: 'pointer' }}
        />
        <button
          type="button"
          onClick={openSearch}
          style={{ padding: '0 16px', background: '#c9f236', color: '#171e00', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderRadius: 10, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
        >
          검색
        </button>
      </div>
    </div>
  );
}
