import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json();
    const db = supabaseAdmin();
    const { data: o } = await db.from('orders').select('*').eq('order_id', order_id).maybeSingle();
    if (!o) return NextResponse.json({ error: 'order not found' }, { status: 404 });
    if (!o.user_id || !o.course_id) return NextResponse.json({ error: 'missing user or course' }, { status: 400 });
    const { error } = await db.from('user_courses').upsert(
      { user_id: o.user_id, course_id: o.course_id, order_id },
      { onConflict: 'user_id,course_id' }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
