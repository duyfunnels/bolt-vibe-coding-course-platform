import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import nodemailer from 'npm:nodemailer@6.9.14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function render(tpl: string, vars: Record<string, string | number>) {
  return Object.entries(vars || {}).reduce(
    (acc, [k, v]) => acc.split(`{{${k}}}`).join(String(v ?? '')),
    tpl,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { template_slug, to, vars } = await req.json();
    if (!template_slug || !to) {
      return new Response(JSON.stringify({ ok: false, error: 'template_slug and to are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: tpl } = await db
      .from('email_templates')
      .select('subject, html')
      .eq('slug', template_slug)
      .maybeSingle();

    if (!tpl) {
      await db.from('email_logs').insert({
        to_email: to,
        template_slug,
        status: 'failed',
        error: 'template not found',
        payload: vars || {},
      });
      return new Response(JSON.stringify({ ok: false, error: 'template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subject = render(tpl.subject, vars || {});
    const html = render(tpl.html, vars || {});

    const { data: cfg } = await db.from('smtp_config').select('*').eq('id', 1).maybeSingle();
    if (!cfg?.host || !cfg?.username) {
      await db.from('email_logs').insert({
        to_email: to,
        template_slug,
        subject,
        status: 'skipped',
        error: 'smtp not configured',
        payload: vars || {},
      });
      return new Response(JSON.stringify({ ok: false, error: 'smtp not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const port = Number(cfg.port || 587);
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port,
        secure: port === 465,
        auth: { user: cfg.username, pass: cfg.password },
      });
      await transporter.sendMail({
        from: `"${cfg.from_name || 'Academy'}" <${cfg.from_email || cfg.username}>`,
        to,
        subject,
        html,
      });
      await db.from('email_logs').insert({
        to_email: to,
        template_slug,
        subject,
        status: 'sent',
        payload: vars || {},
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      const msg = (e as Error)?.message || 'send failed';
      await db.from('email_logs').insert({
        to_email: to,
        template_slug,
        subject,
        status: 'failed',
        error: msg,
        payload: vars || {},
      });
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error)?.message || 'server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
