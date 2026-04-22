import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendTemplateEmail } from '@/lib/email/send';

export async function POST(req: Request) {
  try {
    const { order_id, template } = await req.json();
    if (!order_id || !template) return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    const db = supabaseAdmin();
    const { data: o } = await db.from('orders').select('*').eq('order_id', order_id).maybeSingle();
    if (!o) return NextResponse.json({ error: 'order not found' }, { status: 404 });
    const { data: c } = await db.from('courses').select('title,slug').eq('id', o.course_id).maybeSingle();
    const vars = {
      order_id,
      customer_name: o.customer_name || o.email,
      email: o.email,
      course_title: c?.title || '',
      amount: new Intl.NumberFormat('vi-VN').format(o.order_amount),
      access_link: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/learn/${c?.slug || ''}`,
      password: '(existing)',
    };
    const r = await sendTemplateEmail(template, o.email, vars);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
