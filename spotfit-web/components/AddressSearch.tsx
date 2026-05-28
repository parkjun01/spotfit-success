'use client';

declare global {
  interface Window {
    daum: any;
  }
}

interface AddressResult {
  address: string;      // 도로명 주소
  zonecode: string;     // 우편번호
  sido: string;         // 시/도
  sigungu: string;      // 시/군/구
}

interface Props {
  value: string;
  onChange: (result: AddressResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function AddressSearch({ value, onChange, placeholder = '주소 검색', label, required }: Props) {
  const openSearch = () => {
    if (!window.daum?.Postcode) {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const address = data.roadAddress || data.jibunAddress;
        onChange({
          address,
          zonecode: data.zonecode,
          sido: data.sido,
          sigungu: data.sigungu,
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
