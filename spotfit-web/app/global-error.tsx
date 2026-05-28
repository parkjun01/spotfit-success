'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'sans-serif', padding: 24, background: '#fff8f8' }}>
        <h2 style={{ color: '#c00', fontSize: 18, marginBottom: 12 }}>⚠ 앱 오류 발생</h2>
        <div style={{ background: '#fff', border: '1px solid #fcc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <p style={{ fontWeight: 'bold', color: '#900', marginBottom: 8 }}>{error.message || '알 수 없는 오류'}</p>
          <pre style={{
            fontSize: 11, color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            maxHeight: 240, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4,
          }}>
            {error.stack}
          </pre>
          {error.digest && (
            <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>digest: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          style={{
            background: '#4F46E5', color: 'white', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
