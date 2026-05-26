import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SpotFit — 운동 파티 매칭',
  description: '위치 기반 1회성 운동 파티 매칭 플랫폼',
  manifest: '/manifest.json',
  themeColor: '#4F46E5',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 네이버맵 JS API */}
        <script
          type="text/javascript"
          src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}&submodules=geocoder`}
        />
      </head>
      <body className="max-w-md mx-auto min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
