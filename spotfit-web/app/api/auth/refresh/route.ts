import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { signTokens } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return error('Refresh 토큰이 필요합니다');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    if (decoded.type !== 'refresh') return error('유효하지 않은 토큰입니다', 401);
    return ok(signTokens(decoded.userId));
  } catch {
    return error('토큰이 만료되었습니다', 401);
  }
}
