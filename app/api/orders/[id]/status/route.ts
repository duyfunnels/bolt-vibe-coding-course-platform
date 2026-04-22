import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { handlePaidSideEffects } from '@/lib/payment-core'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = supabaseAdmin()
    const { status } = await req.json()

    const order_id = params.id

    if (!order_id || !status) {
      return NextResponse.json(
        { error: 'missing order_id or status' },
        { status: 400 }
      )
    }

    // 🔥 1. update order
    const { data: order } = await db
      .from('orders')
      .update({ status })
      .eq('order_id', order_id)
      .select()
      .maybeSingle()

    if (!order) {
      return NextResponse.json(
        { error: 'order not found' },
        { status: 404 }
      )
    }

    // 🔥 2. nếu chuyển sang paid → trigger flow
    if (status === 'paid') {
      await handlePaidSideEffects(order_id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'server error' },
      { status: 500 }
    )
  }
}