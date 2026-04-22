import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { api_key } = await req.json()

    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'API key is required' },
        { status: 400 }
      )
    }

    // 🔥 test call Sepay API
    const res = await fetch(
      'https://my.sepay.vn/userapi/bankaccounts/list',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${api_key.trim()}`,
          Accept: 'application/json',
        },
      }
    )

    // ❗ nếu lỗi network (Bolt sẽ hay bị)
    if (!res) {
      return NextResponse.json({
        ok: false,
        error: 'Cannot connect to Sepay (try deploy to Vercel)'
      })
    }

    // ❗ nếu key sai
    if (res.status === 401) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid API key'
      })
    }

    // ❗ nếu API lỗi
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `Sepay error: HTTP ${res.status}`
      })
    }

    const data = await res.json().catch(() => null)

    // 🔥 KHÔNG validate quá chặt
    if (!data) {
      return NextResponse.json({
        ok: false,
        error: 'Invalid response from Sepay'
      })
    }

    // 🔥 lưu config
    const db = supabaseAdmin()

    const { error } = await db
      .from('payment_configs')
      .update({
        sepay_api_key: api_key.trim(),
        sepay_verified: true,
        sepay_account_info: data,
        sepay_verified_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Sepay verified successfully'
    })

  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || 'verify failed'
    })
  }
}