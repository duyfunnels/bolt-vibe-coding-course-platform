'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { supabase } from '@/lib/supabase/client';
import { formatVND } from '@/lib/format';
import { CircleCheck as CheckCircle2, Clock, Copy, Loader as Loader2, User, Mail, Phone, Building2, Hash, Wallet, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function PayPage({ params }: { params: { orderId: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch(`/api/orders/${params.orderId}/status`, { cache: 'no-store' });
      if (!res.ok) return;
      const o = await res.json();
      if (!mounted) return;
      setOrder(o);
      if (!cfg) {
        const { data: pc } = await supabase.from('payment_configs').select('*').eq('id', 1).maybeSingle();
        setCfg(pc);
      }
      if (!course && o.course_id) {
        const { data: c } = await supabase.from('courses').select('slug,title,thumbnail_url').eq('id', o.course_id).maybeSingle();
        setCourse(c);
      }
      if (o.status === 'paid' && course?.slug) {
        setTimeout(() => router.replace(`/learn/${course.slug}`), 1500);
      }
    };
    load();
    const iv = setInterval(load, 4000);
    return () => { mounted = false; clearInterval(iv); };
  }, [params.orderId, course, cfg, router]);

  const copy = (txt: string, label = 'Đã sao chép') => {
    navigator.clipboard.writeText(String(txt));
    toast.success(label);
  };

  if (!order) {
    return (
      <>
        <SiteNav />
        <main className="mx-auto max-w-3xl px-6 py-16 text-white/60">
          <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Đang tải...</div>
        </main>
      </>
    );
  }

  const qrUrl = cfg?.bank_name && cfg?.account_number
    ? `https://img.vietqr.io/image/${encodeURIComponent(cfg.bank_name)}-${cfg.account_number}-compact2.png?amount=${order.remain_money}&addInfo=${encodeURIComponent(order.order_id)}&accountName=${encodeURIComponent(cfg.account_name || '')}`
    : null;

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-sm text-white/50">Đơn hàng</div>
        <h1 className="text-3xl font-bold text-white">#{order.order_id}</h1>

        {order.status === 'paid' ? (
          <div className="glass mt-8 flex items-center gap-4 rounded-2xl p-6">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
            <div>
              <div className="text-lg font-semibold text-white">Đã nhận thanh toán</div>
              <div className="text-sm text-white/60">Đang chuyển bạn đến trang học...</div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="space-y-6 md:col-span-3">
              {/* Student info */}
              <div className="glass rounded-2xl p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/15 text-blue-300">
                    <User size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Thông tin học viên</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <InfoRow icon={<User size={14} />} label="Họ và tên" value={order.customer_name || '-'} />
                  <InfoRow icon={<Mail size={14} />} label="Email" value={order.email || '-'} />
                  <InfoRow icon={<Phone size={14} />} label="Số điện thoại" value={order.phone || '-'} />
                </div>
              </div>

              {/* Payment info */}
              <div className="glass rounded-2xl p-6">
                <div className="mb-2 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/15 text-orange-300">
                    <Wallet size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Thông tin thanh toán</h2>
                </div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-300">
                  <Clock size={12} /> Chờ thanh toán
                </div>
                <p className="text-sm text-white/60">Vui lòng chuyển khoản đúng số tiền với nội dung bên dưới.</p>

                <div className="mt-5 space-y-2.5 text-sm">
                  <PayRow icon={<Building2 size={14} />} label="Ngân hàng" value={cfg?.bank_name || '(chưa cấu hình)'} />
                  <PayRow
                    icon={<Hash size={14} />}
                    label="Số tài khoản"
                    value={cfg?.account_number || '-'}
                    mono
                    onCopy={cfg?.account_number ? () => copy(cfg.account_number, 'Đã sao chép số tài khoản') : undefined}
                  />
                  <PayRow icon={<User size={14} />} label="Chủ tài khoản" value={cfg?.account_name || '-'} />
                  <PayRow
                    icon={<Wallet size={14} />}
                    label="Số tiền"
                    value={formatVND(order.remain_money)}
                    onCopy={() => copy(order.remain_money, 'Đã sao chép số tiền')}
                    highlightAmount
                  />
                  <PayRow
                    icon={<FileText size={14} />}
                    label="Nội dung chuyển khoản"
                    value={order.order_id}
                    mono
                    highlight
                    onCopy={() => copy(order.order_id, 'Đã sao chép nội dung')}
                  />
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 text-sm text-white/60">
                  Đã thanh toán: <span className="text-white">{formatVND(order.total_money_in)}</span> trên{' '}
                  <span className="text-white">{formatVND(order.order_amount)}</span>
                </div>
              </div>
            </div>

            {/* QR */}
            <div className="glass flex flex-col items-center justify-center rounded-2xl p-6 md:col-span-2">
              {qrUrl ? (
                <>
                  <img src={qrUrl} alt="VietQR" className="max-h-80 rounded-xl border border-white/10 bg-white p-2" />
                  <div className="mt-4 text-center text-xs text-white/50">
                    Quét mã QR bằng ứng dụng ngân hàng để thanh toán ngay
                  </div>
                </>
              ) : (
                <div className="text-center text-white/50">
                  Chưa cấu hình thanh toán ngân hàng.<br />
                  Quản trị viên cần nhập thông tin tài khoản.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-white/60">
        <span className="text-white/40">{icon}</span>
        {label}
      </span>
      <span className="truncate text-right text-white">{value}</span>
    </div>
  );
}

function PayRow({
  icon,
  label,
  value,
  mono,
  highlight,
  highlightAmount,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  highlightAmount?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-white/60">
        <span className="text-white/40">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <div className="flex items-center gap-2">
        <span
          className={[
            'max-w-[220px] truncate',
            mono ? 'font-mono' : '',
            highlight ? 'rounded bg-blue-500/15 px-2 py-0.5 text-blue-300' : '',
            highlightAmount ? 'text-lg font-bold text-white' : 'text-white',
          ].join(' ')}
          title={value}
        >
          {value}
        </span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label={`Sao chép ${label}`}
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
