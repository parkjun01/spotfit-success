import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET!;

export const signTokens = (userId: string) => ({
  access: jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' }),
  refresh: jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' }),
});

export const verifyToken = (token: string): { userId: string } => {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
};

export const getAuthUser = async (req: NextRequest) => {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { userId } = verifyToken(auth.split(' ')[1]);
    const { data } = await supabaseAdmin
      .from('users')
      .select('id, nickname, manner_score, subscription_status')
      .eq('id', userId)
      .eq('is_active', true)
      .single();
    return data;
  } catch {
    return null;
  }
};

export const requireAuth = async (req: NextRequest) => {
  const user = await getAuthUser(req);
  if (!user) throw new AuthError('인증이 필요합니다', 401);
  return user;
};

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
