import { NextResponse } from 'next/server';

export const ok = (data: unknown, status = 200) =>
  NextResponse.json({ success: true, data }, { status });

export const created = (data: unknown) => ok(data, 201);

export const error = (message: string, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

export const handleError = (err: unknown) => {
  if (err instanceof Error && 'status' in err) {
    return error(err.message, (err as any).status);
  }
  console.error(err);
  return error('서버 오류가 발생했습니다', 500);
};
