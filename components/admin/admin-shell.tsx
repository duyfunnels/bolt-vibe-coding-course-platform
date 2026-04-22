'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { BookOpen, DollarSign, GraduationCap, LayoutDashboard, Mail, Receipt, ShoppingCart, Users } from 'lucide-react';

const items = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'Khoá học', icon: BookOpen },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { href: '/admin/transactions', label: 'Tài chính', icon: DollarSign },
  { href: '/admin/users', label: 'Học viên', icon: Users },
  { href: '/admin/payments', label: 'Thanh toán', icon: Receipt },
  { href: '/admin/emails', label: 'Email', icon: Mail },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace('/login?redirect=/admin');
      const { data: p } = await supabase.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
      if (p?.role !== 'admin') return router.replace('/dashboard');
      setReady(true);
    })();
  }, [router]);

  if (!ready) return <div className="grid min-h-screen place-items-center text-white/60">Đang kiểm tra quyền truy cập...</div>;

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-white/5 bg-black/40">
        <Link href="/" className="flex items-center gap-2 border-b border-white/5 p-4 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-orange-500">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold">Northlight</div>
            <div className="text-[10px] uppercase tracking-wide text-white/50">Quản trị</div>
          </div>
        </Link>
        <nav className="p-3">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== '/admin' && pathname.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href}
                className={`mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-blue-500/15 text-white' : 'text-white/70 hover:bg-white/5'}`}>
                <it.icon size={16} /> {it.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="p-6 lg:p-10">{children}</main>
    </div>
  );
}
