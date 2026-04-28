import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { handlePaidSideEffects, handleUnpaidSideEffects  } from '@/lib/payment-core'

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

    // 🔥 lấy trạng thái cũ
    const { data: existing } = await db
      .from('orders')
      .select('*')
      .eq('order_id', params.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'order not found' }, { status: 404 })
    }

    // 🔥 update
    await db
      .from('orders')
      .update({
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      })
      .eq('order_id', params.id)

    // =========================
    // 🔥 LOGIC QUAN TRỌNG
    // =========================

    // ✅ từ chưa paid → paid
    if (existing.status !== 'paid' && status === 'paid') {
      console.log('🔥 ACTIVATE COURSE')
      await handlePaidSideEffects(params.id)
    }

    // ❌ từ paid → pending/failed
    if (existing.status === 'paid' && status !== 'paid') {
      console.log('🚫 REVOKE COURSE')
      await handleUnpaidSideEffects(params.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'server error' },
      { status: 500 }
    )
  }
}