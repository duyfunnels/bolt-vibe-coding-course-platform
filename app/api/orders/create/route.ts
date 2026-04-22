import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendTemplateEmail } from '@/lib/email/send';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { course_slug, email, full_name, phone, user_id } = body;
    if (!course_slug || !email || !full_name || !phone) {
      return NextResponse.json({ error: 'Full name, email and phone number are required' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: course } = await db.from('courses').select('*').eq('slug', course_slug).maybeSingle();
    if (!course) return NextResponse.json({ error: 'course not found' }, { status: 404 });

    const { data: cfg } = await db.from('payment_configs').select('*').eq('id', 1).maybeSingle();
    const prefix = cfg?.transfer_prefix || 'ORD';

    const { data: idData, error: idErr } = await db.rpc('next_order_id', { p_prefix: prefix });
    if (idErr) return NextResponse.json({ error: idErr.message }, { status: 500 });
    const order_id = idData as string;

    let linkedUserId = user_id || null;
    if (!linkedUserId) {
      const { data: prof } = await db.from('profiles').select('id').eq('email', email).maybeSingle();
      if (prof) linkedUserId = prof.id;
    }

    const { error: insErr } = await db.from('orders').insert({
      order_id,
      user_id: linkedUserId,
      email,
      customer_name: full_name || '',
      phone: phone || '',
      course_id: course.id,
      order_amount: course.price,
      payment_mode: course.payment_mode,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    await sendTemplateEmail('order_received', email, {
      order_id,
      customer_name: full_name || email,
      course_title: course.title,
      amount: new Intl.NumberFormat('vi-VN').format(course.price),
    });

    return NextResponse.json({ order_id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}
