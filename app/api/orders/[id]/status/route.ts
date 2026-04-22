import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = supabaseAdmin();
  const { data } = await db
    .from('orders')
    .select('order_id,status,order_amount,total_money_in,remain_money,email,customer_name,phone,course_id')
    .eq('order_id', params.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}
