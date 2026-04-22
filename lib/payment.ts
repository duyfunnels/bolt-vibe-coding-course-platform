import { supabaseAdmin } from '@/lib/supabase/admin'
import { handlePaidSideEffects } from './payment-core'

export async function processBankTransaction({
  order_id,
  amount,
}: {
  order_id: string
  amount: number
}) {
  const db = supabaseAdmin()

  // 1. lấy order
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .maybeSingle()

  if (!order) throw new Error('order not found')

  // 2. lấy tất cả transaction
  const { data: transactions } = await db
    .from('bank_transactions')
    .select('money_in')
    .eq('order_id', order_id)

  const total =
    transactions?.reduce(
      (sum, t) => sum + Number(t.money_in || 0),
      0
    ) || 0

  const remain = Number(order.amount || 0) - total

  // 3. update order
  if (remain <= 0 && order.status !== 'paid') {
    await db
      .from('orders')
      .update({
        total_money_in: total,
        remain_money: remain,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('order_id', order_id)

    // 🔥 TRIGGER DUY NHẤT
    await handlePaidSideEffects(order_id)
  } else {
    await db
      .from('orders')
      .update({
        total_money_in: total,
        remain_money: remain,
      })
      .eq('order_id', order_id)
  }
}