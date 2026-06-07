'use client';

import { useState, useRef } from 'react';

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

interface AddrItem {
  address_name: string;
  road_address_name: string;
  sido: string;
  sigungu: string;
  x: string; // lng
  y: string; // lat
}

export default function AddressSearch({ value, onChange, placeholder = '도로명 또는 지번 주소 검색', label, required }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AddrItem[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const [noResult, setNoResult] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    setQuery(q);
    setNoResult(false);
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setShowDrop(false); return; }

    timer.current = setTimeout(() => {
      const kakao = (window as any).kakao;

      if (!kakao?.maps?.services) {
        // SDK 미로드 시 서버 API fallback (단일 결과)
        setSearching(true);
        fetch(`/api/geocode?address=${encodeURIComponent(q)}`)
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              setResults([{ address_name: q, road_address_name: q, sido: '', sigungu: '', x: String(data.data.lng), y: String(data.data.lat) }]);
              setShowDrop(true);
            } else {
              setNoResult(true);
              setShowDrop(true);
            }
          })
          .catch(() => setNoResult(true))
          .finally(() => setSearching(false));
        return;
      }

      setSearching(true);
      const geocoder = new kakao.maps.services.Geocoder();

      geocoder.addressSearch(q, (res: any[], status: string) => {
        setSearching(false);
        if (status === kakao.maps.services.Status.OK && res.length > 0) {
          const items: AddrItem[] = res.slice(0, 5).map((r: any) => ({
            address_name: r.address_name,
            road_address_name: r.road_address?.address_name || '',
            sido: r.address?.region_1depth_name || '',
            sigungu: r.address?.region_2depth_name || '',
            x: r.x,
            y: r.y,
          }));
          setResults(items);
          setNoResult(false);
          setShowDrop(true);
        } else {
          setResults([]);
          setNoResult(true);
          setShowDrop(true);
        }
      });
    }, 400);
  };

  const select = (item: AddrItem) => {
    const address = item.road_address_name || item.address_name;
    onChange({
      address,
      zonecode: '',
      sido: item.sido,
      sigungu: item.sigungu,
      lat: parseFloat(item.y),
      lng: parseFloat(item.x),
    });
    setQuery(address);
    setResults([]);
    setShowDrop(false);
    setNoResult(false);
  };

  return (
    <div>
      {label && (
        <label style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A8A9A', marginBottom: 6, display: 'block' }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1E1E22', border: '1px solid #2A2A32', borderRadius: 10, padding: '0 14px', height: 48, transition: 'border-color 0.2s' }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = '#c9f236')}
          onBlurCapture={e => (e.currentTarget.style.borderColor = '#2A2A32')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: searching ? '#c9f236' : '#8A8A9A', flexShrink: 0 }}>location_on</span>
          <input
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#e5e2e3' }}
            placeholder={placeholder}
            value={query}
            onChange={e => search(e.target.value)}
            onFocus={() => { if (results.length > 0 || noResult) setShowDrop(true); }}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            autoComplete="off"
          />
          {searching && (
            <div style={{ width: 14, height: 14, border: '2px solid #c9f236', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          )}
          {query && !searching && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); setShowDrop(false); setNoResult(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8A9A', display: 'flex', padding: 0, flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>

        {showDrop && (
          <div style={{ position: 'absolute', top: 52, left: 0, right: 0, background: '#141416', border: '1px solid #2A2A32', borderRadius: 12, zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {noResult ? (
              <div style={{ padding: '14px 16px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#8A8A9A', textAlign: 'center' }}>
                검색 결과가 없습니다
              </div>
            ) : (
              results.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => select(item)}
                  style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', borderTop: i === 0 ? 'none' : '1px solid rgba(42,42,50,0.5)', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1E1E22')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(201,242,54,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#c9f236' }}>home</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {item.road_address_name && (
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#e5e2e3', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.road_address_name}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: '#8A8A9A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: item.road_address_name ? 2 : 0, fontFamily: 'DM Sans, sans-serif' }}>
                      {item.road_address_name ? `지번 ${item.address_name}` : item.address_name}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
