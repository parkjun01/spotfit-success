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
        <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" />
      </head>
      <body className="max-w-md mx-auto min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
