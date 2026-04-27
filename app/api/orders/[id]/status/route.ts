import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { handlePaidSideEffects } from '@/lib/payment-core'

// ✅ GET: lấy order (cho PayPage)
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const db = supabaseAdmin()

  const { data } = await db
    .from('orders')
    .select('*')
    .eq('order_id', params.id)
    .maybeSingle()

  return NextResponse.json(data)
}

// ✅ POST: update status + trigger logic
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = supabaseAdmin()
    const { status } = await req.json()

    if (!status) {
      return NextResponse.json({ error: 'missing status' }, { status: 400 })
    }

    // 🔥 update order
    const { data: order } = await db
      .from('orders')
      .update({ status })
      .eq('order_id', params.id)
      .select()
      .maybeSingle()

    if (!order) {
      return NextResponse.json({ error: 'order not found' }, { status: 404 })
    }

    // 🔥 QUAN TRỌNG: trigger khi paid
    if (status === 'paid') {
      await handlePaidSideEffects(params.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'server error' },
      { status: 500 }
    )
  }
}