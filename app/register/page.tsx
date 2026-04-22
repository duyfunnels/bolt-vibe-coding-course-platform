'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { GraduationCap, Loader as Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signIn.data.session) {
      document.cookie = `sb-access-token=${signIn.data.session.access_token}; path=/; max-age=${signIn.data.session.expires_in}`;
      document.cookie = `sb-refresh-token=${signIn.data.session.refresh_token}; path=/; max-age=604800`;
    }
    toast.success('Đã tạo tài khoản');
    router.push('/dashboard');
  };

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-2xl p-8">
        <Link href="/" className="mb-6 flex items-center gap-2 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-orange-500">
            <GraduationCap size={18} />
          </div>
          <span className="text-lg font-semibold">Northlight</span>
        </Link>
        <h1 className="text-2xl font-bold text-white">Tạo tài khoản mới</h1>
        <p className="mt-1 text-sm text-white/60">Bắt đầu học tập trong vài phút.</p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Họ và tên</label>
            <input value={fullName} onChange={(e)=>setFullName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Email</label>
            <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Mật khẩu</label>
            <input type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500" />
          </div>
        </div>
        <button disabled={loading} className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium">
          {loading && <Loader2 size={16} className="animate-spin" />} Tạo tài khoản
        </button>
        <div className="mt-4 text-center text-sm text-white/60">
          Đã có tài khoản? <Link href="/login" className="text-blue-400 hover:text-blue-300">Đăng nhập</Link>
        </div>
      </form>
    </div>
  );
}
