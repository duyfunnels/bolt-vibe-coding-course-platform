import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { api_key } = await req.json();
    if (!api_key || typeof api_key !== 'string') {
      return NextResponse.json({ ok: false, error: 'API key is required' }, { status: 400 });
    }

    const res = await fetch('https://my.sepay.vn/userapi/bankaccounts/list', {
      headers: {
        Authorization: `Bearer ${api_key.trim()}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Sepay rejected the API key (HTTP ${res.status})` },
        { status: 200 },
      );
    }

    const body = await res.json().catch(() => null);
    if (!body || body.status !== 200 || !Array.isArray(body.bankaccounts)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid response from Sepay. Please double-check the API key.' },
        { status: 200 },
      );
    }

    const accounts = body.bankaccounts;
    const db = supabaseAdmin();
    const { error } = await db
      .from('payment_configs')
      .update({
        sepay_api_key: api_key.trim(),
        sepay_verified: true,
        sepay_account_info: accounts,
        sepay_verified_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, accounts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'verify failed' }, { status: 500 });
  }
}
