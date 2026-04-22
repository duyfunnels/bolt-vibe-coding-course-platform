'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Mail, Server, FileText, History } from 'lucide-react';

type Tab = 'smtp' | 'templates' | 'logs';

export default function EmailsPage() {
  const [tab, setTab] = useState<Tab>('smtp');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Email</h1>
        <p className="mt-1 text-white/60">Cấu hình SMTP, chỉnh sửa mẫu email và xem lịch sử gửi.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10">
        <TabBtn active={tab === 'smtp'} onClick={() => setTab('smtp')} icon={<Server size={14} />}>
          Cấu hình SMTP
        </TabBtn>
        <TabBtn active={tab === 'templates'} onClick={() => setTab('templates')} icon={<FileText size={14} />}>
          Mẫu email
        </TabBtn>
        <TabBtn active={tab === 'logs'} onClick={() => setTab('logs')} icon={<History size={14} />}>
          Lịch sử gửi
        </TabBtn>
      </div>

      {tab === 'smtp' && <SmtpTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'logs' && <LogsTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition ${
        active ? 'border-blue-500 text-white' : 'border-transparent text-white/60 hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function SmtpTab() {
  const [cfg, setCfg] = useState<any>(null);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔥 LOAD DATA
  const load = async () => {
    const { data, error } = await supabase
      .from('smtp_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast.error('Không load được cấu hình SMTP');
      return;
    }

    setCfg(data || { id: 1 });
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // 🔥 SAVE (FIX CHUẨN)
  const save = async () => {
    const { data, error } = await supabase
      .from('smtp_config')
      .update({
        host: cfg.host || '',
        port: Number(cfg.port || 587),
        username: cfg.username || '',
        password: cfg.password || '',
        from_email: cfg.from_email || '',
        from_name: cfg.from_name || 'Academy',
      })
      .eq('id', 1)
      .select()        // 👈 QUAN TRỌNG
      .single();       // 👈 QUAN TRỌNG

    if (error) {
      console.error(error);
      return toast.error(error.message);
    }

    console.log('SMTP UPDATED:', data);

    toast.success('Đã lưu cấu hình SMTP');

    // 🔥 reload lại UI
    await load();
  };

  // 🔥 SEND TEST EMAIL
const sendTest = async () => {
  if (!testTo) return toast.error('Hãy nhập email nhận thử');

  setTesting(true);

  try {
    // 🔥 LẤY SESSION
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      toast.error('Bạn chưa đăng nhập');
      return;
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

        // 🔥 QUAN TRỌNG NHẤT
        Authorization: `Bearer ${session.access_token}`,

        // vẫn giữ apikey (không bắt buộc nhưng nên có)
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        template_slug: 'order_received',
        to: testTo,
        vars: {
          order_id: 'TEST-000',
          customer_name: 'Học viên thử',
          course_title: 'Khoá học demo',
          amount: '100.000',
          email: testTo,
        },
      }),
    });

    const json = await res.json();

    if (!res.ok || json.ok === false) {
      toast.error(json.error || 'Gửi thử thất bại');
    } else {
      toast.success('Đã gửi email thử thành công');
    }

  } catch (err) {
    console.error(err);
    toast.error('Lỗi khi gửi email');
  } finally {
    setTesting(false);
  }
};

  if (loading || !cfg) {
    return <div className="text-white/60">Đang tải...</div>;
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 text-white">
        <Server size={16} className="text-blue-400" />
        <h2 className="text-lg font-semibold">Máy chủ SMTP</h2>
      </div>

      <p className="text-sm text-white/60">
        Cấu hình SMTP để hệ thống gửi email giao dịch.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <F label="Host" value={cfg.host} onChange={(v) => setCfg({ ...cfg, host: v })} />
        <F label="Port" value={String(cfg.port || 587)} onChange={(v) => setCfg({ ...cfg, port: v })} />
        <F label="Username" value={cfg.username} onChange={(v) => setCfg({ ...cfg, username: v })} />
        <F label="Password" value={cfg.password} onChange={(v) => setCfg({ ...cfg, password: v })} type="password" />
        <F label="From email" value={cfg.from_email} onChange={(v) => setCfg({ ...cfg, from_email: v })} />
        <F label="From name" value={cfg.from_name} onChange={(v) => setCfg({ ...cfg, from_name: v })} />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={save}
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
        >
          Lưu cấu hình
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 text-white">
          <Mail size={14} className="text-orange-400" />
          <span className="text-sm font-medium">Gửi email thử</span>
        </div>

        <p className="mt-1 text-xs text-white/50">
          Gửi một email mẫu để kiểm tra cấu hình SMTP.
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="email"
            placeholder="email-nhan-thu@domain.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />

          <button
            onClick={sendTest}
            disabled={testing}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
          >
            {testing ? 'Đang gửi...' : 'Gửi thử'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);

  const load = async () => {
    const { data } = await supabase.from('email_templates').select('*').order('slug');
    setTemplates(data || []);
    if (!active && data && data[0]) setActive(data[0]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
  if (!active) return;

  const { data, error } = await supabase
    .from('email_templates')
    .update({
      subject: active.subject,
      html: active.html,
    })
    .eq('id', active.id)
    .select()
    .single(); // 👈 thêm dòng này

  if (error) {
    console.error(error);
    return toast.error(error.message);
  }

  console.log('UPDATED:', data); // debug luôn

  toast.success('Đã lưu mẫu email');

  await load(); // 👈 thêm await cho chắc
};

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <div className="glass rounded-2xl p-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-white/50">Mẫu</div>
        <ul className="space-y-1">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => setActive(t)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  active?.id === t.id ? 'bg-blue-500/15 text-white' : 'text-white/70 hover:bg-white/5'
                }`}
              >
                {t.slug}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {active && (
        <div className="glass rounded-2xl p-6">
          <div className="mb-3">
            <label className="mb-1 block text-sm text-white/70">Tiêu đề</label>
            <input
              value={active.subject}
              onChange={(e) => setActive({ ...active, subject: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Nội dung HTML</label>
            <textarea
              rows={14}
              value={active.html}
              onChange={(e) => setActive({ ...active, html: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white"
            />
          </div>
          <p className="mt-2 text-xs text-white/50">
            Biến hỗ trợ: {'{{order_id}}'}, {'{{customer_name}}'}, {'{{email}}'}, {'{{course_title}}'}, {'{{amount}}'}, {'{{password}}'}, {'{{access_link}}'}
          </p>
          <button onClick={save} className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium">Lưu mẫu</button>
        </div>
      )}
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(100);
      setLogs(data || []);
    })();
  }, []);

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="border-b border-white/5 p-4 font-semibold text-white">Lịch sử gửi email</div>
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-left text-white/60">
          <tr>
            <th className="p-3">Thời gian</th>
            <th className="p-3">Người nhận</th>
            <th className="p-3">Mẫu</th>
            <th className="p-3">Tiêu đề</th>
            <th className="p-3">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t border-white/5 text-white/80">
              <td className="p-3 text-xs">{formatDate(l.created_at)}</td>
              <td className="p-3">{l.to_email}</td>
              <td className="p-3">{l.template_slug}</td>
              <td className="p-3">{l.subject}</td>
              <td className="p-3">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    l.status === 'sent'
                      ? 'bg-green-500/15 text-green-300'
                      : l.status === 'skipped'
                      ? 'bg-white/10 text-white/60'
                      : 'bg-red-500/15 text-red-300'
                  }`}
                >
                  {l.status}
                </span>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-white/50">Chưa có log nào.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function F({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}
