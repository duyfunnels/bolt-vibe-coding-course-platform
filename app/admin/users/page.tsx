'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };
  useEffect(() => { load(); }, []);

  const toggleRole = async (u: any) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    const { error } = await supabase.from('profiles').update({ role: next }).eq('id', u.id);
    if (error) return toast.error(error.message);
    toast.success('Đã cập nhật phân quyền');
    load();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white">Học viên</h1>
      <div className="glass mt-6 overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr><th className="p-3">Email</th><th className="p-3">Họ tên</th><th className="p-3">Phân quyền</th><th className="p-3">Tham gia</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u)=> (
              <tr key={u.id} className="border-t border-white/5 text-white/80">
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.full_name}</td>
                <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs ${u.role==='admin'?'bg-orange-500/15 text-orange-300':'bg-blue-500/15 text-blue-300'}`}>{u.role}</span></td>
                <td className="p-3 text-white/60">{formatDate(u.created_at)}</td>
                <td className="p-3 text-right"><button onClick={()=>toggleRole(u)} className="rounded border border-white/10 px-2 py-1 text-xs text-white/80">Đổi quyền</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
