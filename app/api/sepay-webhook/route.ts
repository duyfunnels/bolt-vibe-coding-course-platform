import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { handlePaidSideEffects } from '../payment-webhook/route';

export async function POST(req: Request) {
  try {
    const db = supabaseAdmin();
    const { data: cfg } = await db.from('payment_configs').select('sepay_api_key,transfer_prefix').eq('id', 1).maybeSingle();
    const provided = req.headers.get('authorization')?.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '') || '';
    if (cfg?.sepay_api_key && provided !== cfg.sepay_api_key) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // Sepay payload: { id, transferType, transferAmount, content, referenceCode, ... }
    if (body.transferType && body.transferType !== 'in') {
      return NextResponse.json({ ok: true, ignored: true });
    }
    const amount = Number(body.transferAmount || body.amount || 0);
    const content: string = body.content || body.description || '';
    const prefix = cfg?.transfer_prefix || 'ORD';
    const match = content.match(new RegExp(`${prefix}\\d{5,}`, 'i'));
    if (!match || amount <= 0) {
      return NextResponse.json({ error: 'cannot parse order id or amount' }, { status: 400 });
    }
    const order_id = match[0].toUpperCase();

    const { error: insErr } = await db.from('bank_transactions').insert({
      order_id,
      money_in: amount,
      bank_ref: body.referenceCode || body.id || `sepay-${Date.now()}`,
      content,
      source: 'sepay',
      raw: body,
    });
    if (insErr && !insErr.message.includes('duplicate')) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    import { processBankTransaction } from '@/lib/payment'

await processBankTransaction({
  order_id,
  amount
});
    return NextResponse.json({ ok: true, order_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}
