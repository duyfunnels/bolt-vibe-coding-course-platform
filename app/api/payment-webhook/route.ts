import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendTemplateEmail } from '@/lib/email/send';

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + 'A1!';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = supabaseAdmin();

    const { data: cfg } = await db.from('payment_configs').select('transfer_prefix').eq('id', 1).maybeSingle();
    const prefix = cfg?.transfer_prefix || 'ORD';

    const content: string = body.content || body.description || body.memo || body.transferContent || '';
    const amountRaw = body.amount ?? body.money_in ?? body.value ?? 0;
    const bankRef: string = body.ref || body.reference || body.id || body.txId || '';

    const orderRe = new RegExp(`${prefix}\\d{5,}`, 'i');
    const match = content.match(orderRe);
    const amountNum = Number(String(amountRaw).replace(/[^0-9.-]/g, '')) || 0;
    if (!match || amountNum <= 0) {
      return NextResponse.json({ error: 'cannot parse order id or amount', content, amount: amountNum }, { status: 400 });
    }
    const order_id = match[0].toUpperCase();

    const { error: insErr } = await db.from('bank_transactions').insert({
      order_id,
      money_in: amountNum,
      bank_ref: bankRef || `sms-${Date.now()}`,
      content,
      source: 'webhook',
      raw: body,
    });
    if (insErr && !insErr.message.includes('duplicate')) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    await handlePaidSideEffects(order_id);
    return NextResponse.json({ ok: true, order_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}

export async function handlePaidSideEffects(order_id: string) {
  const db = supabaseAdmin();
  const { data: o } = await db.from('orders').select('*').eq('order_id', order_id).maybeSingle();
  if (!o || o.status !== 'paid') return;

  const { data: course } = await db.from('courses').select('title,slug').eq('id', o.course_id).maybeSingle();

  if (!o.user_id) {
    const password = randomPassword();
    const created = await db.auth.admin.createUser({
      email: o.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: o.customer_name },
    });
    if (created.data.user) {
      await db.from('orders').update({ user_id: created.data.user.id }).eq('order_id', order_id);
      if (course) {
        await db.from('user_courses').upsert(
          { user_id: created.data.user.id, course_id: o.course_id, order_id },
          { onConflict: 'user_id,course_id' }
        );
      }
      await sendTemplateEmail('account_created', o.email, {
        email: o.email,
        password,
        access_link: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/login`,
      });
    }
  }

  await sendTemplateEmail('payment_success', o.email, {
    order_id,
    course_title: course?.title || '',
    access_link: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/learn/${course?.slug || ''}`,
  });
}
