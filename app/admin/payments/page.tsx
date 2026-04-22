'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { VIETQR_BANKS } from '@/lib/banks';
import {
  Banknote,
  Building2,
  Copy,
  Eye,
  EyeOff,
  Key,
  Webhook,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  Settings,
  Landmark,
} from 'lucide-react';

type SepayAccount = {
  id?: string | number;
  bank_short_name?: string;
  bank_full_name?: string;
  account_number?: string;
  account_holder_name?: string;
  account_holder?: string;
  label?: string;
};

export default function PaymentsPage() {
  const [cfg, setCfg] = useState<any>(null);
  const [showSepayKey, setShowSepayKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('payment_configs').select('*').eq('id', 1).maybeSingle();
      setCfg(data || { id: 1, sepay_enabled: true });
    })();
  }, []);

  const saveAll = async () => {
    setSaving(true);
    const { error } = await supabase.from('payment_configs').update({
      sepay_webhook_secret: cfg.sepay_webhook_secret || '',
      sepay_enabled: cfg.sepay_enabled ?? true,
      bank_name: cfg.bank_name || '',
      account_number: cfg.account_number || '',
      account_name: cfg.account_name || '',
      transfer_prefix: cfg.transfer_prefix || 'ORD',
    }).eq('id', 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Đã lưu cấu hình');
  };

  const verifySepay = async () => {
    if (!cfg?.sepay_api_key) {
      toast.error('Hãy nhập API Key Sepay trước');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/admin/verify-sepay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: cfg.sepay_api_key }),
      });
      const data = await res.json();
      if (!data.ok) {
        await supabase.from('payment_configs').update({
          sepay_api_key: cfg.sepay_api_key,
          sepay_verified: false,
          sepay_account_info: [],
        }).eq('id', 1);
        setCfg({ ...cfg, sepay_verified: false, sepay_account_info: [] });
        toast.error(data.error || 'Không xác minh được API Key');
      } else {
        setCfg({
          ...cfg,
          sepay_verified: true,
          sepay_account_info: data.accounts || [],
          sepay_verified_at: new Date().toISOString(),
        });
        toast.success('API Key hợp lệ — đã kết nối Sepay');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Không kết nối được Sepay');
    } finally {
      setVerifying(false);
    }
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success('Đã sao chép');
  };

  if (!cfg) return <div className="text-white/60">Đang tải...</div>;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const sepayWebhookUrl = `${origin}/api/sepay-webhook`;
  const bankWebhookUrl = `${origin}/api/payment-webhook`;

  const sepayAccounts: SepayAccount[] = Array.isArray(cfg.sepay_account_info) ? cfg.sepay_account_info : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Cài đặt thanh toán</h1>
        <p className="mt-1 text-white/60">
          Cấu hình chuyển khoản thủ công cho mã QR và tích hợp Sepay để tự động xác nhận đơn hàng.
        </p>
      </div>

      {/* Manual bank transfer (unchanged behavior) */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2 text-white">
          <Landmark size={16} className="text-blue-400" />
          <h2 className="text-lg font-semibold">Chuyển khoản ngân hàng thủ công</h2>
        </div>
        <p className="mb-4 text-sm text-white/60">
          Thông tin dưới đây được dùng để sinh mã VietQR và đối soát giao dịch đến.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-white/70">Ngân hàng</label>
            <select
              value={cfg.bank_name || ''}
              onChange={(e) => setCfg({ ...cfg, bank_name: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-blue-500"
            >
              <option value="" className="bg-slate-900">Chọn ngân hàng...</option>
              {VIETQR_BANKS.map((b) => (
                <option key={b} value={b} className="bg-slate-900">{b}</option>
              ))}
            </select>
          </div>
          <Field label="Số tài khoản" value={cfg.account_number} onChange={(v) => setCfg({ ...cfg, account_number: v })} placeholder="0123456789" />
          <Field label="Chủ tài khoản" value={cfg.account_name} onChange={(v) => setCfg({ ...cfg, account_name: v })} placeholder="NGUYEN VAN A" />
          <Field label="Tiền tố nội dung chuyển khoản" value={cfg.transfer_prefix} onChange={(v) => setCfg({ ...cfg, transfer_prefix: v })} placeholder="ORD" />
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          Webhook URL (SMS/Cổng ngân hàng): <code className="font-mono text-blue-300">{bankWebhookUrl}</code>
        </div>
      </div>

      {/* Sepay section */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2 text-white">
          <Key size={16} className="text-blue-400" />
          <h2 className="text-lg font-semibold">API Key Sepay</h2>
        </div>
        <label className="block text-sm font-medium text-white">API Key</label>
        <p className="mb-2 text-xs text-white/50">
          Lấy API key tại{' '}
          <a href="https://my.sepay.vn" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">my.sepay.vn</a> → Cài đặt → API
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <input
              type={showSepayKey ? 'text' : 'password'}
              value={cfg.sepay_api_key || ''}
              onChange={(e) => setCfg({ ...cfg, sepay_api_key: e.target.value, sepay_verified: false })}
              placeholder="sk_..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-white outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowSepayKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/60 hover:text-white"
              aria-label="Hiện/ẩn API key"
            >
              {showSepayKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button
            onClick={verifySepay}
            disabled={verifying}
            className="btn-primary rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {verifying ? 'Đang xác minh...' : 'Lưu & Xác minh'}
          </button>
        </div>

        {cfg.sepay_verified ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
            <CheckCircle2 size={16} /> API key hợp lệ — Đã kết nối thành công với Sepay
            {cfg.sepay_verified_at && (
              <span className="ml-auto text-xs text-emerald-300/70">
                {new Date(cfg.sepay_verified_at).toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        ) : cfg.sepay_api_key ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70">
            <AlertCircle size={16} /> Chưa xác minh — hãy bấm &quot;Lưu &amp; Xác minh&quot;
          </div>
        ) : null}
      </div>

      {/* Sepay bank accounts (real data from API) */}
      {cfg.sepay_verified && (
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2 text-white">
            <Building2 size={16} className="text-blue-400" />
            <h2 className="text-lg font-semibold">Tài khoản ngân hàng đã kết nối (Sepay)</h2>
          </div>

          {sepayAccounts.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Tài khoản Sepay của bạn chưa có ngân hàng nào. Hãy thêm tài khoản trong trang quản trị Sepay.
            </div>
          ) : (
            <div className="space-y-3">
              {sepayAccounts.map((acc, i) => {
                const bankName = acc.bank_short_name || acc.bank_full_name || acc.label || 'Ngân hàng';
                const holder = acc.account_holder_name || acc.account_holder || '';
                return (
                  <div
                    key={(acc.id as any) ?? i}
                    className="flex items-center gap-4 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-transparent p-4"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-500/15 text-blue-300">
                      <Banknote size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-white">
                        <span className="truncate font-semibold">{bankName}</span>
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                          Hoạt động
                        </span>
                      </div>
                      {acc.account_number && (
                        <div className="mt-0.5 font-mono text-sm text-white/80">{acc.account_number}</div>
                      )}
                      {holder && <div className="text-xs text-white/60">{holder}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Webhook configuration */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2 text-white">
          <Webhook size={16} className="text-blue-400" />
          <h2 className="text-lg font-semibold">Cấu hình Webhook Sepay</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white">Webhook URL (Sepay)</label>
            <p className="mb-2 text-xs text-white/50">
              Sao chép URL này và dán vào phần cấu hình Webhook trên{' '}
              <a href="https://my.sepay.vn" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">my.sepay.vn</a> → Cài đặt → Webhook
            </p>
            <UrlRow value={sepayWebhookUrl} onCopy={() => copy(sepayWebhookUrl)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-white">Webhook Secret Key (tuỳ chọn)</label>
            <p className="mb-2 text-xs text-white/50">
              Dùng để xác thực request. Nếu thiết lập, gửi kèm header{' '}
              <code className="rounded bg-white/10 px-1 font-mono">X-Webhook-Secret</code> khi gọi webhook.
            </p>
            <input
              value={cfg.sepay_webhook_secret || ''}
              onChange={(e) => setCfg({ ...cfg, sepay_webhook_secret: e.target.value })}
              placeholder="Nhập secret key (tuỳ chọn)..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <div className="text-sm font-medium text-white">Kích hoạt Webhook</div>
              <div className="text-xs text-white/50">Tự động xác nhận đơn hàng khi nhận được thanh toán.</div>
            </div>
            <button
              onClick={() => setCfg({ ...cfg, sepay_enabled: !cfg.sepay_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${cfg.sepay_enabled ? 'bg-blue-500' : 'bg-white/20'}`}
              aria-label="Toggle webhook"
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${cfg.sepay_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={saveAll}
        disabled={saving}
        className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        <Settings size={16} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
      </button>

      <div className="glass rounded-2xl p-6 text-sm text-white/70">
        <div className="mb-3 font-semibold text-white">Hướng dẫn cài đặt nhanh:</div>
        <ol className="list-inside list-decimal space-y-1.5">
          <li>Đăng nhập <a className="text-blue-400 hover:underline" href="https://my.sepay.vn" target="_blank" rel="noreferrer">my.sepay.vn</a> và lấy API key tại mục Cài đặt → API</li>
          <li>Dán API key vào ô trên và bấm &quot;Lưu &amp; Xác minh&quot;</li>
          <li>Sao chép Webhook URL ở trên</li>
          <li>Trên Sepay: vào Cài đặt → Webhook → dán URL và bật webhook</li>
          <li>Khi khách thanh toán, hệ thống sẽ tự động xác nhận đơn hàng</li>
        </ol>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}

function UrlRow({ value, onCopy }: { value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={value}
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white"
      />
      <button
        onClick={onCopy}
        className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="Sao chép"
      >
        <Copy size={16} />
      </button>
    </div>
  );
}
