import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { handlePaidSideEffects, handleUnpaidSideEffects  } from '@/lib/payment-core'

// =========================
// ✅ GET: lấy order
// =========================
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

// =========================
// ✅ POST: update status
// =========================
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = supabaseAdmin()
    const { status } = await req.json()

    if (!status) {
      return NextResponse.json(
        { error: 'missing status' },
        { status: 400 }
      )
    }

    // 🔥 lấy order hiện tại
    const { data: existing } = await db
      .from('orders')
      .select('*')
      .eq('order_id', params.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { error: 'order not found' },
        { status: 404 }
      )
    }

    console.log('🔄 STATUS UPDATE:', {
      order_id: params.id,
      from: existing.status,
      to: status,
      is_activated: existing.is_activated,
    })

    // 🔥 update status
    await db
      .from('orders')
      .update({
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      })
      .eq('order_id', params.id)

    // =========================
    // 🔥 LOGIC CHUẨN
    // =========================

    // ✅ ACTIVATE (chỉ khi chưa activate)
    if (status === 'paid' && !existing.is_activated) {
      console.log('🔥 ACTIVATE COURSE')
      await handlePaidSideEffects(params.id)
    }

    // ❌ REVOKE (chỉ khi đã từng activate)
    if (status !== 'paid' && existing.is_activated) {
      console.log('🚫 REVOKE COURSE')
      await handleUnpaidSideEffects(params.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('❌ STATUS ERROR:', e)

    return NextResponse.json(
      { error: e?.message || 'server error' },
      { status: 500 }
    )
  }
}