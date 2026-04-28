import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendTemplateEmail } from '@/lib/email/send'

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + 'A1!'
}

export async function handlePaidSideEffects(order_id: string) {
  const db = supabaseAdmin()

  // 1. lấy order
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .maybeSingle()

  if (!order || order.status !== 'paid' || order.is_activated) return

  // 2. lấy course
  const { data: course } = await db
    .from('courses')
    .select('title,slug')
    .eq('id', order.course_id)
    .maybeSingle()

  // 3. tìm user (tạm dùng listUsers)
  const { data: users } = await db.auth.admin.listUsers()
  const existingUser = users?.users?.find(u => u.email === order.email)

  let userId = order.user_id
  let password: string | null = null

  // 4. tạo user nếu chưa có
  if (!existingUser) {
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

  // 5. assign course
  if (userId && course) {
    await db.from('user_courses').upsert(
      {
        user_id: userId,
        course_id: order.course_id,
        order_id,
      },
      { onConflict: 'user_id,course_id' }
    )
  }

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
}

export async function handleUnpaidSideEffects(order_id: string) {
  const db = supabaseAdmin()

  // 1. lấy order
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('order_id', order_id)
    .maybeSingle()

  if (!order) return

  // 2. xoá quyền học
  await db
    .from('user_courses')
    .delete()
    .eq('order_id', order_id)

  // 3. reset trạng thái activated
  await db
    .from('orders')
    .update({
      is_activated: false,
      activated_at: null,
    })
    .eq('order_id', order_id)

  console.log('❌ REVOKED ACCESS:', order_id)
}