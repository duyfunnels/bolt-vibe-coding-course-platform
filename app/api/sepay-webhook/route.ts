import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { processBankTransaction } from '@/lib/payment'

export async function POST(req: Request) {
  try {
    const db = supabaseAdmin()

    const { data: cfg } = await db
      .from('payment_configs')
      .select('transfer_prefix, sepay_api_key')
      .eq('id', 1)
      .maybeSingle()

    const token =
      req.headers.get('authorization')?.replace('Bearer ', '') || ''

    if (cfg?.sepay_api_key && token !== cfg.sepay_api_key) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    if (body.transferType && body.transferType !== 'in') {
      return NextResponse.json({ ok: true })
    }

    const content = body.content || ''
    const amount = Number(body.transferAmount || 0)

    const prefix = cfg?.transfer_prefix || 'ORD'
    const match = content.match(new RegExp(`${prefix}\\d{5,}`, 'i'))

    if (!match || amount <= 0) {
      return NextResponse.json({ error: 'invalid data' }, { status: 400 })
    }

    const order_id = match[0].toUpperCase()

    await db.from('bank_transactions').insert({
      order_id,
      money_in: amount,
      bank_ref: body.referenceCode || `sepay-${Date.now()}`,
      content,
      source: 'sepay',
      raw: body,
    })

    await processBankTransaction({
      order_id,
      amount,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}