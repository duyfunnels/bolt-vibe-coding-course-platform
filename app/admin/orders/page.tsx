'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { formatDate, formatVND } from '@/lib/format';
import { Search } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
    setOrders(data || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => orders.filter(o =>
    (!q || o.order_id.toLowerCase().includes(q.toLowerCase()) || o.email.toLowerCase().includes(q.toLowerCase())) &&
    (!status || o.status === status)
  ), [orders, q, status]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Đơn hàng</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <Search size={14} className="text-white/40" />
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Tìm theo mã đơn hoặc email"
            className="w-64 bg-transparent text-sm text-white outline-none" />
        </div>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ thanh toán</option>
          <option value="paid">Đã thanh toán</option>
          <option value="failed">Thất bại</option>
          <option value="cancelled">Đã huỷ</option>
        </select>
      </div>
      <div className="glass mt-6 overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Khách hàng</th>
              <th className="p-3">Số tiền</th>
              <th className="p-3">Đã trả</th>
              <th className="p-3">Còn lại</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Tạo lúc</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.order_id} className="border-t border-white/5 text-white/80 hover:bg-white/5">
                <td className="p-3 font-mono"><Link href={`/admin/orders/${o.order_id}`} className="text-blue-400">{o.order_id}</Link></td>
                <td className="p-3">{o.email}</td>
                <td className="p-3">{formatVND(o.order_amount)}</td>
                <td className="p-3">{formatVND(o.total_money_in)}</td>
                <td className="p-3">{formatVND(o.remain_money)}</td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-xs ${o.status==='paid'?'bg-green-500/15 text-green-300':o.status==='pending'?'bg-orange-500/15 text-orange-300':'bg-red-500/15 text-red-300'}`}>{o.status}</span>
                </td>
                <td className="p-3 text-white/60">{formatDate(o.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-white/50">Chưa có đơn hàng.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
