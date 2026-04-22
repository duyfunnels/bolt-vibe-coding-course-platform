'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDate, formatVND } from '@/lib/format';
import { Search, ArrowUpDown } from 'lucide-react';

type Row = {
  transfer_time: string;
  order_id: string | null;
  money_in: number;
  total_money_in: number;
  remain_money: number;
  product: string;
  order_amount: number;
  customer_name: string;
  email: string;
};

export default function FinancePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [desc, setDesc] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: txs } = await supabase
        .from('bank_transactions')
        .select('transfer_time, money_in, order_id')
        .order('transfer_time', { ascending: false })
        .limit(500);
      const orderIds = Array.from(new Set((txs || []).map(t => t.order_id).filter(Boolean))) as string[];
      const { data: orders } = await supabase
        .from('orders')
        .select('order_id,email,customer_name,order_amount,total_money_in,remain_money,course_id')
        .in('order_id', orderIds.length ? orderIds : ['__none__']);
      const courseIds = Array.from(new Set((orders || []).map(o => o.course_id).filter(Boolean))) as string[];
      const { data: courses } = await supabase.from('courses').select('id,title').in('id', courseIds.length ? courseIds : ['__none__']);
      const courseMap = Object.fromEntries((courses || []).map((c: any) => [c.id, c.title]));
      const orderMap = Object.fromEntries((orders || []).map((o: any) => [o.order_id, o]));
      const built: Row[] = (txs || []).map((t: any) => {
        const o = orderMap[t.order_id] || {};
        return {
          transfer_time: t.transfer_time,
          order_id: t.order_id,
          money_in: t.money_in,
          total_money_in: o.total_money_in || 0,
          remain_money: o.remain_money || 0,
          product: courseMap[o.course_id] || '-',
          order_amount: o.order_amount || 0,
          customer_name: o.customer_name || '',
          email: o.email || '',
        };
      });
      setRows(built);
    })();
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (q) r = r.filter(x => (x.order_id || '').toLowerCase().includes(q.toLowerCase()));
    r = [...r].sort((a,b) => {
      const at = new Date(a.transfer_time).getTime();
      const bt = new Date(b.transfer_time).getTime();
      return desc ? bt - at : at - bt;
    });
    return r;
  }, [rows, q, desc]);

  const exportCsv = () => {
    const header = ['transfer_time','order_id','money_in','total_money_in','remain_money','product','order_amount','customer_name','email'];
    const lines = [header.join(',')].concat(filtered.map(r => [r.transfer_time,r.order_id,r.money_in,r.total_money_in,r.remain_money,JSON.stringify(r.product),r.order_amount,JSON.stringify(r.customer_name),r.email].join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Tài chính</h1>
      <p className="text-white/60">Sổ giao dịch ngân hàng cập nhật theo thời gian thực.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2">
          <Search size={14} className="text-white/40" />
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Lọc theo mã đơn"
            className="w-64 bg-transparent text-sm text-white outline-none" />
        </div>
        <button onClick={()=>setDesc(!desc)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80">
          <ArrowUpDown size={14} /> {desc ? 'Mới nhất' : 'Cũ nhất'}
        </button>
        <button onClick={exportCsv} className="btn-primary rounded-lg px-3 py-2 text-sm font-medium">Xuất CSV</button>
      </div>

      <div className="glass mt-6 overflow-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="p-3">Thời gian</th>
              <th className="p-3">Mã đơn</th>
              <th className="p-3">Tiền vào</th>
              <th className="p-3">Tổng đã nhận</th>
              <th className="p-3">Còn lại</th>
              <th className="p-3">Sản phẩm</th>
              <th className="p-3">Số tiền</th>
              <th className="p-3">Khách hàng</th>
              <th className="p-3">Email</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t border-white/5 text-white/80">
                <td className="p-3 text-xs">{formatDate(r.transfer_time)}</td>
                <td className="p-3 font-mono">{r.order_id}</td>
                <td className="p-3 text-green-300">{formatVND(r.money_in)}</td>
                <td className="p-3">{formatVND(r.total_money_in)}</td>
                <td className="p-3">{formatVND(r.remain_money)}</td>
                <td className="p-3">{r.product}</td>
                <td className="p-3">{formatVND(r.order_amount)}</td>
                <td className="p-3">{r.customer_name}</td>
                <td className="p-3 text-white/60">{r.email}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-white/50">Chưa có giao dịch.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
