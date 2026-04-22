import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendTemplateEmail } from '@/lib/email/send';

// 🔐 tạo password random
function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + 'A1!';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = supabaseAdmin();

    // 🔥 1. lấy prefix
    const { data: cfg } = await db
      .from('payment_configs')
      .select('transfer_prefix')
      .eq('id', 1)
      .maybeSingle();

    const prefix = cfg?.transfer_prefix || 'ORD';

    // 🔥 2. parse content + amount
    const content: string =
      body.content || body.description || body.memo || body.transferContent || '';

    const amountRaw =
      body.amount ?? body.money_in ?? body.value ?? 0;

    const bankRef: string =
      body.ref || body.reference || body.id || body.txId || '';

    const orderRe = new RegExp(`${prefix}\\d{5,}`, 'i');
    const match = content.match(orderRe);

    const amountNum =
      Number(String(amountRaw).replace(/[^0-9.-]/g, '')) || 0;

    if (!match || amountNum <= 0) {
      return NextResponse.json(
        {
          error: 'cannot parse order id or amount',
          content,
          amount: amountNum,
        },
        { status: 400 }
      );
    }

    const order_id = match[0].toUpperCase();

    // 🔥 3. insert transaction
    await db.from('bank_transactions').insert({
      order_id,
      money_in: amountNum,
      bank_ref: bankRef || `sms-${Date.now()}`,
      content,
      source: 'webhook',
      raw: body,
    });

    // 🔥 4. lấy order
    const { data: order } = await db
      .from('orders')
      .select('*')
      .eq('order_id', order_id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { error: 'order not found' },
        { status: 404 }
      );
    }

    // 🔥 5. tính tổng tiền
    const { data: transactions } = await db
      .from('bank_transactions')
      .select('money_in')
      .eq('order_id', order_id);

    const total =
      transactions?.reduce(
        (sum, t) => sum + Number(t.money_in || 0),
        0
      ) || 0;

    const remain = Number(order.amount || 0) - total;

    // 🔥 6. update order
    if (remain <= 0 && order.status !== 'paid') {
      await db
        .from('orders')
        .update({
          total_money_in: total,
          remain_money: remain,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('order_id', order_id);

      // 🔥 trigger flow chính
      await handlePaidSideEffects(order_id);
    } else {
      await db
        .from('orders')
        .update({
          total_money_in: total,
          remain_money: remain,
        })
        .eq('order_id', order_id);
    }

    return NextResponse.json({ ok: true, order_id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'server error' },
      { status: 500 }
    );
  }
}

// 🚀 CORE BUSINESS LOGIC
async function handlePaidSideEffects(order_id: string) {
  const db = supabaseAdmin();

  // 🔥 1. lấy order
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .maybeSingle();

  // ❗ guard chống chạy lại
  if (!order || order.status !== 'paid' || order.is_activated) return;

  // 🔥 2. lấy course
  const { data: course } = await db
    .from('courses')
    .select('title,slug')
    .eq('id', order.course_id)
    .maybeSingle();

  // 🔥 3. check user tồn tại
  const { data: existingUser } =
    await db.auth.admin.getUserByEmail(order.email);

  let userId = order.user_id;
  let password: string | null = null;

  // 🔥 4. tạo user nếu chưa có
  if (!existingUser?.user) {
    password = randomPassword();

    const created = await db.auth.admin.createUser({
      email: order.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: order.customer_name,
      },
    });

    if (created.data.user) {
      userId = created.data.user.id;

      await db
        .from('orders')
        .update({ user_id: userId })
        .eq('order_id', order_id);

      // 🔥 gửi email account
      await sendTemplateEmail('account_created', order.email, {
        email: order.email,
        password,
        access_link: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/login`,
      });
    }
  } else {
    userId = existingUser.user.id;
  }

  // 🔥 5. assign course (LUÔN LUÔN)
  if (userId && course) {
    await db.from('user_courses').upsert(
      {
        user_id: userId,
        course_id: order.course_id,
        order_id,
      },
      { onConflict: 'user_id,course_id' }
    );
  }

  // 🔥 6. mark activated
  await db
    .from('orders')
    .update({
      is_activated: true,
      activated_at: new Date().toISOString(),
    })
    .eq('order_id', order_id);

  // 🔥 7. email success
  await sendTemplateEmail('payment_success', order.email, {
    order_id,
    course_title: course?.title || '',
    access_link: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/learn/${course?.slug || ''}`,
  });
}