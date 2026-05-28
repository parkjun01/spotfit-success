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
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'ko' } }
    );
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
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
        onChange({
          address,
          zonecode: data.zonecode,
          sido: data.sido,
          sigungu: data.sigungu,
          lat: coords?.lat,
          lng: coords?.lng,
        });
      },
      theme: { bgColor: '#4F46E5', searchBgColor: '#4F46E5', queryTextColor: '#FFFFFF' },
    }).open();
  };

  return (
    <div>
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1 block">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="flex gap-2">
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
          className="px-3 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap"
        >
          검색
        </button>
      </div>
    </div>
  );
}
