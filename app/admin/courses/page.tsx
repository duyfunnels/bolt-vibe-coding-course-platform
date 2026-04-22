'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { formatVND } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: '', slug: '', subtitle: '', description: '', price: 0, thumbnail_url: '', payment_mode: 'manual' as 'manual'|'sepay' });

  const load = async () => {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setCourses(data || []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('courses').insert(form);
    if (error) return toast.error(error.message);
    toast.success('Đã tạo khoá học');
    setShow(false);
    setForm({ title: '', slug: '', subtitle: '', description: '', price: 0, thumbnail_url: '', payment_mode: 'manual' });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Khoá học</h1>
          <p className="text-white/60">Tạo và quản lý danh mục khoá học.</p>
        </div>
        <button onClick={() => setShow(true)} className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Plus size={16} /> Thêm khoá học
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/courses/${c.id}`} className="glass overflow-hidden rounded-2xl transition hover:-translate-y-1">
            <div className="aspect-video w-full bg-white/5">
              {c.thumbnail_url && <img src={c.thumbnail_url} className="h-full w-full object-cover" alt="" />}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white">{c.title}</div>
                  <div className="text-xs text-white/50">{c.slug}</div>
                </div>
                <Pencil size={16} className="text-white/40" />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/70">{formatVND(c.price)}</span>
                <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-white/60">{c.payment_mode}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6" onClick={()=>setShow(false)}>
          <form onClick={(e)=>e.stopPropagation()} onSubmit={create} className="glass w-full max-w-lg rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white">Thêm khoá học</h2>
            <div className="mt-4 space-y-3">
              <Input label="Tiêu đề" value={form.title} onChange={(v)=>setForm({...form, title: v, slug: form.slug || slugify(v)})} />
              <Input label="Slug" value={form.slug} onChange={(v)=>setForm({...form, slug: v})} />
              <Input label="Tiêu đề phụ" value={form.subtitle} onChange={(v)=>setForm({...form, subtitle: v})} />
              <Input label="URL ảnh thumbnail" value={form.thumbnail_url} onChange={(v)=>setForm({...form, thumbnail_url: v})} />
              <Input label="Giá (VND)" type="number" value={String(form.price)} onChange={(v)=>setForm({...form, price: Number(v)})} />
              <div>
                <label className="mb-1 block text-sm text-white/70">Mô tả</label>
                <textarea value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" rows={4} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">Phương thức thanh toán</label>
                <select value={form.payment_mode} onChange={(e)=>setForm({...form, payment_mode: e.target.value as any})}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white">
                  <option value="manual">Chuyển khoản ngân hàng</option>
                  <option value="sepay">Sepay</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={()=>setShow(false)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80">Huỷ</button>
              <button className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Tạo mới</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type='text' }: { label: string; value: string; onChange: (v: string)=>void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <input type={type} value={value} onChange={(e)=>onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-500" />
    </div>
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
