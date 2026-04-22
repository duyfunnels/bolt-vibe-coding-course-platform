'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { GraduationCap, LayoutDashboard, LogOut, Shield } from 'lucide-react';

export function SiteNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string>('user');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setEmail(data.user.email || null);
        const { data: p } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();
        if (p?.role) setRole(p.role);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'sb-access-token=; Max-Age=0; path=/';
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#07090f]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-orange-500">
            <GraduationCap size={18} />
          </div>
          <span className="text-lg font-semibold">Northlight</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <Link href="/courses" className="hover:text-white">Khoá học</Link>
          <Link href="/#features" className="hover:text-white">Tính năng</Link>
          <Link href="/#pricing" className="hover:text-white">Bảng giá</Link>
        </nav>
        <div className="flex items-center gap-3">
          {email ? (
            <>
              {role === 'admin' && (
                <Link href="/admin" className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:text-white md:inline-flex">
                  <Shield size={14} /> Quản trị
                </Link>
              )}
              <Link href="/dashboard" className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:text-white md:inline-flex">
                <LayoutDashboard size={14} /> Bảng điều khiển
              </Link>
              <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:text-white">
                <LogOut size={14} /> Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-white/70 hover:text-white">Đăng nhập</Link>
              <Link href="/register" className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">
                Bắt đầu ngay
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
