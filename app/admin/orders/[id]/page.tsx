'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { formatDate, formatVND } from '@/lib/format';
import { toast } from 'sonner';

export default function AdminOrderDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [money, setMoney] = useState('');
  const [ref, setRef] = useState('');

  const load = async () => {
    const { data: o } = await supabase.from('orders').select('*').eq('order_id', params.id).maybeSingle();
    if (!o) return router.replace('/admin/orders');
    setOrder(o);
    if (o.course_id) {
      const { data: c } = await supabase.from('courses').select('title,slug').eq('id', o.course_id).maybeSingle();
      setCourse(c);
    }
    const { data: t } = await supabase.from('bank_transactions').select('*').eq('order_id', params.id).order('transfer_time', { ascending: false });
    setTxs(t || []);
  };
  useEffect(() => { load(); }, [params.id]);

  const setStatus = async (s: string) => {
    const { error } = await supabase.from('orders').update({ status: s }).eq('order_id', params.id);
    if (error) return toast.error(error.message);
    toast.success('Đã cập nhật trạng thái');
    load();
  };

  const addTx = async () => {
    const amt = Number(money); if (!amt) return toast.error('Nhập số tiền');
    const { error } = await supabase.from('bank_transactions').insert({
      order_id: params.id, money_in: amt, bank_ref: ref || `manual-${Date.now()}`, content: `Manual add for ${params.id}`, source: 'admin',
    });
    if (error) return toast.error(error.message);
    setMoney(''); setRef('');
    toast.success('Đã thêm giao dịch');
    load();
  };

  const resendEmail = async (slug: string) => {
    if (!order) return;
    const res = await fetch('/api/admin/resend-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: params.id, template: slug }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || 'Thất bại');
    toast.success('Đã gửi email');
  };

  const activate = async () => {
    const res = await fetch('/api/admin/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: params.id }),
    });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || 'Thất bại');
    toast.success('Đã kích hoạt khoá học cho học viên');
    load();
  };

  if (!order) return <div className="text-white/60">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-white/50">Đơn hàng</div>
          <h1 className="text-3xl font-bold text-white">#{order.order_id}</h1>
          <div className="mt-1 text-white/60">
            {order.customer_name && <>{order.customer_name} &middot; </>}
            {order.email}
            {order.phone && <> &middot; {order.phone}</>}
            {course && <> &middot; {course.title}</>}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm ${order.status==='paid'?'bg-green-500/15 text-green-300':'bg-orange-500/15 text-orange-300'}`}>{order.status}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Stat label="Số tiền đơn" value={formatVND(order.order_amount)} />
        <Stat label="Tổng đã nhận" value={formatVND(order.total_money_in)} />
        <Stat label="Còn lại" value={formatVND(order.remain_money)} />
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Thao tác</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setStatus('paid')} className="rounded-lg bg-green-500/20 px-3 py-1.5 text-sm text-green-300">Đánh dấu đã thanh toán</button>
          <button onClick={()=>setStatus('pending')} className="rounded-lg bg-orange-500/20 px-3 py-1.5 text-sm text-orange-300">Đánh dấu chờ</button>
          <button onClick={()=>setStatus('failed')} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm text-red-300">Đánh dấu thất bại</button>
          <button onClick={activate} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80">Kích hoạt khoá học</button>
          <button onClick={()=>resendEmail('order_received')} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80">Gửi lại email đơn hàng</button>
          <button onClick={()=>resendEmail('payment_success')} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80">Gửi lại email thanh toán</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Thêm thanh toán thủ công</h2>
        <div className="flex flex-wrap gap-3">
          <input placeholder="Số tiền" value={money} onChange={(e)=>setMoney(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
          <input placeholder="Mã tham chiếu (tuỳ chọn)" value={ref} onChange={(e)=>setRef(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
          <button onClick={addTx} className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Thêm</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Giao dịch</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-white/60">
            <tr><th className="p-2">Thời gian</th><th className="p-2">Tiền vào</th><th className="p-2">Mã GD</th><th className="p-2">Nguồn</th><th className="p-2">Nội dung</th></tr>
          </thead>
          <tbody>
            {txs.map((t)=> (
              <tr key={t.id} className="border-t border-white/5 text-white/80">
                <td className="p-2">{formatDate(t.transfer_time)}</td>
                <td className="p-2">{formatVND(t.money_in)}</td>
                <td className="p-2 font-mono text-xs">{t.bank_ref}</td>
                <td className="p-2">{t.source}</td>
                <td className="p-2 text-white/60">{t.content}</td>
              </tr>
            ))}
            {txs.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-white/50">Chưa có giao dịch.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
