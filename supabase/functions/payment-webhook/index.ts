import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Webhook-Secret',
};

function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    const parts = k.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null) break;
      cur = cur[p];
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return undefined;
}

function parseAmountFromSms(text: string): number {
  const m = text.match(/\+\s*([0-9][0-9.,]*)\s*VND/i) || text.match(/\bGD\s*:?\s*\+?\s*([0-9][0-9.,]*)/i);
  if (!m) return 0;
  return Number(m[1].replace(/[^0-9]/g, '')) || 0;
}

async function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + 'A1!';
}

async function callSendEmail(template_slug: string, to: string, vars: Record<string, any>) {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ template_slug, to, vars }),
    });
  } catch (_) {
    // swallow — email_logs captures failures
  }
}

async function fulfillPaidOrder(db: any, order_id: string) {
  const { data: o } = await db.from('orders').select('*').eq('order_id', order_id).maybeSingle();
  if (!o || o.status !== 'paid') return;

  const { data: course } = await db.from('courses').select('title,slug').eq('id', o.course_id).maybeSingle();
  const siteUrl = Deno.env.get('SITE_URL') || '';

  if (!o.user_id) {
    const password = await randomPassword();
    const created = await db.auth.admin.createUser({
      email: o.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: o.customer_name, phone: o.phone || '' },
    });
    if (created.data?.user) {
      await db.from('orders').update({ user_id: created.data.user.id }).eq('order_id', order_id);
      if (course) {
        await db.from('user_courses').upsert(
          { user_id: created.data.user.id, course_id: o.course_id, order_id },
          { onConflict: 'user_id,course_id' },
        );
      }
      await callSendEmail('account_created', o.email, {
        email: o.email,
        password,
        access_link: `${siteUrl}/login`,
      });
    }
  }

  await callSendEmail('payment_success', o.email, {
    order_id,
    course_title: course?.title || '',
    access_link: `${siteUrl}/learn/${course?.slug || ''}`,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: cfg } = await db.from('payment_configs').select('*').eq('id', 1).maybeSingle();
    const expectedSecret: string = (cfg?.bank_webhook_secret || '').trim();
    if (expectedSecret) {
      const provided =
        req.headers.get('x-webhook-secret') ||
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').replace(/^Apikey\s+/i, '') ||
        '';
      if (provided !== expectedSecret) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const raw = await req.json();
    const items = Array.isArray(raw) ? raw : [raw];
    const prefix: string = cfg?.transfer_prefix || 'ORD';
    const orderRe = new RegExp(`${prefix}\\d{3,}`, 'i');

    const results: any[] = [];
    for (const payload of items) {
      const content: string =
        pick(payload, [
          'content', 'description', 'memo', 'transferContent',
          'query.sms_message', 'body.content', 'params.sms_message',
        ]) || '';

      const amountRaw = pick(payload, [
        'amount', 'money_in', 'value', 'transferAmount',
        'body.amount',
      ]);

      const bankRef: string =
        pick(payload, ['ref', 'reference', 'id', 'txId', 'referenceCode', 'headers.x-request-id']) || '';

      const match = content.match(orderRe);
      let amountNum = Number(String(amountRaw ?? '').replace(/[^0-9.-]/g, '')) || 0;
      if (!amountNum && content) amountNum = parseAmountFromSms(content);

      if (!match || amountNum <= 0) {
        results.push({ error: 'cannot parse order id or amount', content, amount: amountNum });
        continue;
      }
      const order_id = match[0].toUpperCase();

      const { error: insErr } = await db.from('bank_transactions').insert({
        order_id,
        money_in: amountNum,
        bank_ref: bankRef || `sms-${Date.now()}`,
        content,
        source: 'webhook',
        raw: payload,
      });
      if (insErr && !insErr.message.includes('duplicate')) {
        results.push({ error: insErr.message, order_id });
        continue;
      }

      await fulfillPaidOrder(db, order_id);
      results.push({ ok: true, order_id, amount: amountNum });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error)?.message || 'server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
