-- 이메일 인증 시스템 마이그레이션
-- Supabase SQL Editor에서 실행하세요

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 이메일 유니크 인덱스 (이메일이 있는 경우만)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON users(email) WHERE email IS NOT NULL;

-- OTP 테이블
CREATE TABLE IF NOT EXISTS email_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 만료된 OTP 자동 정리 (선택)
CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);
CREATE INDEX IF NOT EXISTS email_otps_expires_idx ON email_otps(expires_at);
