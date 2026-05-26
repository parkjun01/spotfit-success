import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { ok, error, handleError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { paymentKey, orderId, amount, planType } = await req.json();

    // 멱등성 체크 (NFR-6.1)
    const { data: existing } = await supabaseAdmin
      .from('subscriptions').select('id').eq('toss_order_id', orderId).single();
    if (existing) return error('이미 처리된 결제입니다', 409);

    // 토스페이먼츠 결제 확인
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const tossData = await tossRes.json();
    if (!tossRes.ok || tossData.status !== 'DONE') {
      return error(tossData.message || '결제 실패');
    }

    const months = planType === 'yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await supabaseAdmin.from('subscriptions').insert({
      user_id: user.id, plan_type: planType, amount,
      toss_payment_key: paymentKey, toss_order_id: orderId,
      starts_at: new Date().toISOString(), expires_at: expiresAt.toISOString(),
    });
    await supabaseAdmin.from('users').update({
      subscription_status: 'premium',
      subscription_expires_at: expiresAt.toISOString(),
    }).eq('id', user.id);

    return ok({ expiresAt, planType });
  } catch (err) { return handleError(err); }
}
