import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🔥 MAIN FUNCTION
export async function handleOrderPaid(orderId: string) {
  // 1. lấy order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!order) return

  // ❗ chống chạy lại
  if (order.is_activated) return

  // ❗ chỉ chạy khi paid
  if (order.status !== 'paid') return

  // 2. check user
  const { data: existingUser } =
    await supabase.auth.admin.getUserByEmail(order.email)

  let userId: string

  if (!existingUser?.user) {
    // tạo user mới
    const password = Math.random().toString(36).slice(-8)

    const { data: newUser } = await supabase.auth.admin.createUser({
      email: order.email,
      password,
      email_confirm: true
    })

    userId = newUser.user.id

    console.log('Created user:', order.email, password)
  } else {
    userId = existingUser.user.id
  }

  // 3. assign course
  await supabase.from('user_courses').insert({
    user_id: userId,
    course_id: order.course_id
  })

  // 4. update order
  await supabase
    .from('orders')
    .update({
      is_activated: true,
      activated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  // 5. email (placeholder)
  console.log('Send email to:', order.email)
}