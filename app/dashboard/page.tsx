'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { supabase } from '@/lib/supabase/client';
import { formatVND, formatDate } from '@/lib/format';
import { BookOpen, Receipt } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace('/login?redirect=/dashboard');
      const { data: uc } = await supabase
        .from('user_courses')
        .select('granted_at, courses:course_id(id,slug,title,thumbnail_url)')
        .eq('user_id', u.user.id);
      setCourses(uc || []);
      const { data: os } = await supabase
        .from('orders')
        .select('order_id,order_amount,status,created_at,course_id')
        .eq('user_id', u.user.id)
        .order('created_at', { ascending: false });
      setOrders(os || []);
    })();
  }, [router]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold text-white">Bảng điều khiển của tôi</h1>

        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><BookOpen size={18} /> Khoá học của tôi</h2>
          {courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {courses.map((c: any) => (
                <Link key={c.courses?.id} href={`/learn/${c.courses?.slug}`} className="glass overflow-hidden rounded-2xl transition hover:-translate-y-1">
                  <div className="aspect-video w-full bg-white/5">
                    {c.courses?.thumbnail_url && <img src={c.courses.thumbnail_url} className="h-full w-full object-cover" alt="" />}
                  </div>
                  <div className="p-4">
                    <div className="font-medium text-white">{c.courses?.title}</div>
                    <div className="mt-1 text-xs text-white/50">Mở khoá lúc {formatDate(c.granted_at)}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-8 text-center text-white/60">
              Bạn chưa sở hữu khoá học nào. <Link href="/courses" className="text-blue-400">Khám phá khoá học</Link>
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><Receipt size={18} /> Lịch sử đơn hàng</h2>
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-white/60">
                <tr>
                  <th className="p-3">Mã đơn</th>
                  <th className="p-3">Số tiền</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Ngày</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.order_id} className="border-t border-white/5 text-white/80">
                    <td className="p-3 font-mono">{o.order_id}</td>
                    <td className="p-3">{formatVND(o.order_amount)}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${o.status==='paid'?'bg-green-500/15 text-green-300':'bg-orange-500/15 text-orange-300'}`}>{o.status}</span>
                    </td>
                    <td className="p-3">{formatDate(o.created_at)}</td>
                    <td className="p-3 text-right">
                      {o.status !== 'paid' && <Link href={`/pay/${o.order_id}`} className="text-blue-400 hover:text-blue-300">Thanh toán &rarr;</Link>}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-white/50">Chưa có đơn hàng.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
