'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { supabase } from '@/lib/supabase/client';
import { formatVND } from '@/lib/format';
import { toast } from 'sonner';
import { Loader as Loader2 } from 'lucide-react';

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from('courses').select('*').eq('slug', params.slug).maybeSingle();
      setCourse(c);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        setEmail(u.user.email || '');
        setUserId(u.user.id);
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', u.user.id).maybeSingle();
        if (p?.full_name) setFullName(p.full_name);
        const { data: uc } = await supabase
          .from('user_courses')
          .select('id')
          .eq('user_id', u.user.id)
          .eq('course_id', c?.id || '')
          .maybeSingle();
        if (uc) router.replace(`/learn/${params.slug}`);
      }
    })();
  }, [params.slug, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_slug: params.slug, email, full_name: fullName, phone, user_id: userId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return toast.error(data.error || 'Không tạo được đơn hàng');
    router.push(`/pay/${data.order_id}`);
  };

  if (!course) {
    return (
      <>
        <SiteNav />
        <main className="mx-auto max-w-3xl px-6 py-16 text-white/60">Đang tải khoá học...</main>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-white">Thanh toán</h1>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
          <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-6">
            <div>
              <label className="mb-1 block text-sm text-white/70">Họ và tên <span className="text-orange-400">*</span></label>
              <input value={fullName} onChange={(e)=>setFullName(e.target.value)} required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Email <span className="text-orange-400">*</span></label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500" />
              {!userId && <p className="mt-1 text-xs text-white/50">Tài khoản sẽ được tạo sau khi thanh toán.</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Số điện thoại <span className="text-orange-400">*</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e)=>setPhone(e.target.value)}
                required
                pattern="[0-9+\s\-()]{8,}"
                placeholder="VD: 0901234567"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500"
              />
            </div>
            <button disabled={loading} className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium">
              {loading && <Loader2 size={16} className="animate-spin" />} Tiếp tục thanh toán
            </button>
          </form>
          <aside className="glass h-fit rounded-2xl p-6">
            <div className="text-sm text-white/60">Tóm tắt đơn hàng</div>
            <div className="mt-3 flex items-start gap-3">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} className="h-14 w-20 rounded-md object-cover" alt="" />
              )}
              <div>
                <div className="font-medium text-white">{course.title}</div>
                <div className="text-xs text-white/50">Thanh toán một lần</div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-white/60">Tổng cộng</span>
              <span className="text-xl font-bold text-white">{formatVND(course.price)}</span>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
