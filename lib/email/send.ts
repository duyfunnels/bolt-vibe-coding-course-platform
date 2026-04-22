export async function sendTemplateEmail(
  templateSlug: string,
  to: string,
  vars: Record<string, string | number>,
) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ template_slug: templateSlug, to, vars }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error || `http ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'edge function unreachable' };
  }
}
