'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatVND } from '@/lib/format';
import { BookOpen, ShoppingCart, Users, Wallet } from 'lucide-react';

export default function AdminHome() {
  const [stats, setStats] = useState({ courses: 0, orders: 0, users: 0, revenue: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: courses }, { count: orders }, { count: users }, { data: paid }] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('order_amount').eq('status', 'paid'),
      ]);
      const revenue = (paid || []).reduce((s: number, o: any) => s + Number(o.order_amount), 0);
      setStats({ courses: courses || 0, orders: orders || 0, users: users || 0, revenue });
    })();
  }, []);

  const cards = [
    { label: 'Khoá học', value: stats.courses, icon: BookOpen, color: 'text-blue-400 bg-blue-500/15' },
    { label: 'Đơn hàng', value: stats.orders, icon: ShoppingCart, color: 'text-orange-400 bg-orange-500/15' },
    { label: 'Học viên', value: stats.users, icon: Users, color: 'text-blue-400 bg-blue-500/15' },
    { label: 'Doanh thu', value: formatVND(stats.revenue), icon: Wallet, color: 'text-orange-400 bg-orange-500/15' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Tổng quan</h1>
      <p className="mt-1 text-white/60">Toàn cảnh hoạt động của học viện.</p>
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-lg ${c.color}`}><c.icon size={18} /></div>
            <div className="text-sm text-white/60">{c.label}</div>
            <div className="mt-1 text-2xl font-bold text-white">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
