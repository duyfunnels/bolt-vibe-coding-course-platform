import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { processBankTransaction } from '@/lib/payment'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const db = supabaseAdmin()

    const { data: cfg } = await db
      .from('payment_configs')
      .select('transfer_prefix')
      .eq('id', 1)
      .maybeSingle()

    const prefix = cfg?.transfer_prefix || 'ORD'

    const content =
      body.content || body.description || body.memo || body.transferContent || ''

    const amountRaw =
      body.amount ?? body.money_in ?? body.value ?? 0

    const bankRef =
      body.ref || body.reference || body.id || body.txId || ''

    const match = content.match(new RegExp(`${prefix}\\d{5,}`, 'i'))

    const amountNum =
      Number(String(amountRaw).replace(/[^0-9.-]/g, '')) || 0

    if (!match || amountNum <= 0) {
      return NextResponse.json(
        { error: 'cannot parse order id or amount' },
        { status: 400 }
      )
    }

    const order_id = match[0].toUpperCase()

    // insert transaction
    await db.from('bank_transactions').insert({
      order_id,
      money_in: amountNum,
      bank_ref: bankRef || `sms-${Date.now()}`,
      content,
      source: 'webhook',
      raw: body,
    })

    // 🔥 xử lý core
    await processBankTransaction({
      order_id,
      amount: amountNum,
    })

    return NextResponse.json({ ok: true, order_id })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'server error' },
      { status: 500 }
    )
  }
}