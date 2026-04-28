import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTemplateEmail } from '@/lib/email/send'

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + 'A1!'
}

/**
 * =========================
 * ✅ HANDLE PAID
 * =========================
 */
export async function handlePaidSideEffects(order_id: string) {
  const db = supabaseAdmin()

  console.log('🔥 handlePaidSideEffects', order_id)

  // 1. lấy order
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .maybeSingle()

  if (!order) {
    console.log('❌ no order')
    return
  }

  // ❗ tránh chạy lại
  if (order.status !== 'paid') {
    console.log('⚠️ not paid → skip')
    return
  }

  if (order.is_activated) {
    console.log('⚠️ already activated → skip')
    return
  }

  // 2. lấy course
  const { data: course } = await db
    .from('courses')
    .select('title,slug')
    .eq('id', order.course_id)
    .maybeSingle()

  // 3. tìm user
  const { data: users } = await db.auth.admin.listUsers()
  const existingUser = users?.users?.find(
    (u) => u.email === order.email
  )

  let userId = order.user_id
  let password: string | null = null

  // 4. tạo user nếu chưa có
  if (!existingUser) {
    console.log('👤 creating new user')

    password = randomPassword()

    const created = await db.auth.admin.createUser({
      email: order.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: order.customer_name,
      },
    })

    if (created.data.user) {
      userId = created.data.user.id

      await db
        .from('orders')
        .update({ user_id: userId })
        .eq('order_id', order_id)

      await sendTemplateEmail('account_created', order.email, {
        email: order.email,
        password,
        access_link: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
      })
    }
  } else {
    userId = existingUser.id
  }

  // ❗ nếu vẫn không có user → stop
  if (!userId) {
    console.log('❌ no userId → abort')
    return
  }

  // 5. assign course
  console.log('🎓 assign course')

  await db.from('user_courses').upsert(
    {
      user_id: userId,
      course_id: order.course_id,
      order_id,
    },
    { onConflict: 'user_id,course_id' }
  )

  // 6. mark activated
  await db
    .from('orders')
    .update({
      is_activated: true,
      activated_at: new Date().toISOString(),
    })
    .eq('order_id', order_id)

  // 7. email success
  await sendTemplateEmail('payment_success', order.email, {
    order_id,
    course_title: course?.title || '',
    access_link: `${process.env.NEXT_PUBLIC_SITE_URL}/learn/${course?.slug || ''}`,
  })

  console.log('✅ activated success')
}

/**
 * =========================
 * ❌ HANDLE UNPAID (REVOKE)
 * =========================
 */
export async function handleUnpaidSideEffects(order_id: string) {
  const db = supabaseAdmin()

  console.log('🚫 handleUnpaidSideEffects', order_id)

  // 1. lấy order
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .maybeSingle()

  if (!order) {
    console.log('❌ no order')
    return
  }

  // ❗ nếu chưa từng activate thì skip
  if (!order.is_activated) {
    console.log('⚠️ not activated → skip revoke')
    return
  }

  // ❗ nếu chưa có user → không revoke được
  if (!order.user_id) {
    console.log('⚠️ no user_id → skip revoke')
    return
  }

  console.log('🧹 deleting access', {
    user_id: order.user_id,
    course_id: order.course_id,
  })

  // 2. DELETE quyền học
  const { error } = await db
    .from('user_courses')
    .delete()
    .eq('user_id', order.user_id)
    .eq('course_id', order.course_id)

  if (error) {
    console.error('❌ delete error:', error)
  } else {
    console.log('✅ revoked access')
  }

  // 3. reset trạng thái
  await db
    .from('orders')
    .update({
      is_activated: false,
      activated_at: null,
    })
    .eq('order_id', order_id)
}