'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, FileText, Video, X, Loader as Loader2, ExternalLink } from 'lucide-react';

type Lesson = {
  id: string;
  title: string;
  position: number;
  video_provider: 'youtube' | 'vimeo' | 'gumlet' | 'iframe';
  video_url: string;
  content: string;
  is_preview: boolean;
};
type Module = { id: string; title: string; position: number; lessons: Lesson[] };

export default function AdminCourseEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);
  const [modal, setModal] = useState<{ kind: 'module' | 'lesson'; moduleId?: string } | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  const load = async () => {
    const { data: c } = await supabase.from('courses').select('*').eq('id', params.id).maybeSingle();
    if (!c) return router.replace('/admin/courses');
    setCourse(c);
    const { data: mods } = await supabase
      .from('modules')
      .select('id,title,position,lessons:lessons(id,title,position,video_provider,video_url,content,is_preview)')
      .eq('course_id', params.id)
      .order('position');
    const sorted: Module[] = (mods || []).map((m: any) => ({
      ...m,
      lessons: (m.lessons || []).sort((a: any, b: any) => a.position - b.position),
    }));
    setModules(sorted);
    setExpandedModules((prev) => {
      const next = { ...prev };
      sorted.forEach((m) => { if (next[m.id] === undefined) next[m.id] = true; });
      return next;
    });
  };
  useEffect(() => { load(); }, [params.id]);

  const saveCourse = async () => {
    setSavingCourse(true);
    const { error } = await supabase.from('courses').update({
      title: course.title, slug: course.slug, subtitle: course.subtitle, description: course.description,
      thumbnail_url: course.thumbnail_url, price: course.price, payment_mode: course.payment_mode, published: course.published,
    }).eq('id', course.id);
    setSavingCourse(false);
    if (error) return toast.error(error.message);
    toast.success('Đã lưu khoá học');
  };

  const openAddModule = () => { setModalTitle(''); setModal({ kind: 'module' }); };
  const openAddLesson = (moduleId: string) => { setModalTitle(''); setModal({ kind: 'lesson', moduleId }); };

  const submitModal = async () => {
    if (!modal || !modalTitle.trim()) return toast.error('Vui lòng nhập tiêu đề');
    if (modal.kind === 'module') {
      const { error } = await supabase.from('modules').insert({ course_id: params.id, title: modalTitle.trim(), position: modules.length });
      if (error) return toast.error(error.message);
      toast.success('Đã thêm chương');
    } else if (modal.moduleId) {
      const mod = modules.find(m => m.id === modal.moduleId);
      const pos = mod?.lessons.length || 0;
      const { data, error } = await supabase.from('lessons').insert({ module_id: modal.moduleId, title: modalTitle.trim(), position: pos }).select().maybeSingle();
      if (error) return toast.error(error.message);
      toast.success('Đã thêm bài học');
      if (data) setEditingLesson({ moduleId: modal.moduleId, lesson: data as Lesson });
    }
    setModal(null);
    setModalTitle('');
    load();
  };

  const deleteModule = async (id: string) => {
    if (!confirm('Xoá chương này cùng tất cả bài học?')) return;
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Đã xoá chương');
    load();
  };

  const renameModule = async (id: string, title: string) => {
    await supabase.from('modules').update({ title }).eq('id', id);
  };

  const saveLesson = async () => {
    if (!editingLesson) return;
    const l = editingLesson.lesson;
    const { error } = await supabase.from('lessons').update({
      title: l.title,
      video_provider: l.video_provider,
      video_url: l.video_url,
      content: l.content,
      is_preview: l.is_preview,
    }).eq('id', l.id);
    if (error) return toast.error(error.message);
    toast.success('Đã lưu bài học');
    setEditingLesson(null);
    load();
  };

  const deleteLesson = async (id: string) => {
    if (!confirm('Xoá bài học này?')) return;
    await supabase.from('lessons').delete().eq('id', id);
    toast.success('Đã xoá bài học');
    load();
  };

  if (!course) return <div className="flex items-center gap-2 text-white/60"><Loader2 className="animate-spin" size={16} /> Đang tải...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-white/50">Đang chỉnh sửa khoá học</div>
          <h1 className="text-3xl font-bold text-white">{course.title}</h1>
          <a href={`/courses/${course.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
            /{course.slug} <ExternalLink size={12} />
          </a>
        </div>
        <button onClick={saveCourse} disabled={savingCourse} className="btn-primary inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium">
          {savingCourse && <Loader2 size={14} className="animate-spin" />} Lưu khoá học
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Thông tin khoá học</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Tiêu đề" value={course.title} onChange={(v)=>setCourse({...course, title: v})} />
          <Field label="Slug" value={course.slug} onChange={(v)=>setCourse({...course, slug: v})} />
          <Field label="Phụ đề" value={course.subtitle || ''} onChange={(v)=>setCourse({...course, subtitle: v})} />
          <Field label="Ảnh bìa (URL)" value={course.thumbnail_url || ''} onChange={(v)=>setCourse({...course, thumbnail_url: v})} placeholder="https://images.pexels.com/..." />
          <Field label="Giá (VND)" value={String(course.price)} onChange={(v)=>setCourse({...course, price: Number(v) || 0})} type="number" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Phương thức thanh toán</label>
            <select value={course.payment_mode} onChange={(e)=>setCourse({...course, payment_mode: e.target.value})}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-blue-500">
              <option value="manual">Chuyển khoản ngân hàng thủ công</option>
              <option value="sepay">Sepay</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-white/80">Mô tả</label>
            <textarea value={course.description || ''} onChange={(e)=>setCourse({...course, description: e.target.value})}
              rows={5} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-blue-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={!!course.published} onChange={(e)=>setCourse({...course, published: e.target.checked})}
              className="h-4 w-4 rounded border-white/20 bg-white/5" />
            Đã xuất bản
          </label>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Chương trình học</h2>
            <p className="text-sm text-white/50">Sắp xếp khoá học thành các chương và bài học.</p>
          </div>
          <button onClick={openAddModule} className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium">
            <Plus size={14} /> Thêm chương
          </button>
        </div>
        <div className="space-y-3">
          {modules.map((m, i) => {
            const open = expandedModules[m.id];
            return (
              <div key={m.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
                  <button onClick={()=>setExpandedModules(s => ({...s, [m.id]: !open}))} className="text-white/50 hover:text-white">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <GripVertical size={14} className="text-white/20" />
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">{String(i+1).padStart(2, '0')}</span>
                  <input
                    value={m.title}
                    onChange={(e)=>setModules(prev => prev.map(x => x.id===m.id ? {...x, title: e.target.value} : x))}
                    onBlur={(e)=>renameModule(m.id, e.target.value)}
                    className="flex-1 rounded-md bg-transparent px-2 py-1 font-medium text-white outline-none focus:bg-white/5"
                  />
                  <span className="text-xs text-white/40">{m.lessons.length} bài học</span>
                  <button onClick={()=>deleteModule(m.id)} className="rounded p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
                {open && (
                  <div className="space-y-2 p-4">
                    {m.lessons.map((l, li) => (
                      <div key={l.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
                        <span className="w-8 text-xs text-white/40">{String(li+1).padStart(2,'0')}</span>
                        {l.video_url ? <Video size={14} className="text-blue-400" /> : <FileText size={14} className="text-white/30" />}
                        <button onClick={()=>setEditingLesson({ moduleId: m.id, lesson: l })} className="flex-1 text-left text-sm text-white hover:text-blue-300">
                          {l.title}
                        </button>
                        {l.is_preview && <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300">PREVIEW</span>}
                        <button onClick={()=>setEditingLesson({ moduleId: m.id, lesson: l })} className="rounded border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/5">
                          Sửa
                        </button>
                        <button onClick={()=>deleteLesson(l.id)} className="rounded p-1 text-white/40 hover:bg-red-500/10 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button onClick={()=>openAddLesson(m.id)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white">
                      <Plus size={12} /> Thêm bài học
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {modules.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
              <div className="text-white/60">Chưa có chương nào.</div>
              <button onClick={openAddModule} className="btn-primary mt-3 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium">
                <Plus size={14} /> Tạo chương đầu tiên
              </button>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal.kind === 'module' ? 'Chương mới' : 'Bài học mới'} onClose={()=>setModal(null)}>
          <Field label="Tiêu đề" value={modalTitle} onChange={setModalTitle} autoFocus
            placeholder={modal.kind === 'module' ? 'VD: Bắt đầu' : 'VD: Giới thiệu & cài đặt'} />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={()=>setModal(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">Huỷ</button>
            <button onClick={submitModal} className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Tạo</button>
          </div>
        </Modal>
      )}

      {editingLesson && (
        <Modal title={`Chỉnh sửa bài học`} onClose={()=>setEditingLesson(null)} wide>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Tiêu đề bài học" value={editingLesson.lesson.title}
              onChange={(v)=>setEditingLesson(s => s ? { ...s, lesson: { ...s.lesson, title: v } } : s)} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Nguồn video</label>
              <select
                value={editingLesson.lesson.video_provider}
                onChange={(e)=>setEditingLesson(s => s ? { ...s, lesson: { ...s.lesson, video_provider: e.target.value as any } } : s)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-blue-500"
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="gumlet">Gumlet</option>
                <option value="iframe">Nhúng iframe HTML</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-white/80">
                {editingLesson.lesson.video_provider === 'iframe' ? 'Mã HTML iframe' : 'Đường dẫn video'}
              </label>
              {editingLesson.lesson.video_provider === 'iframe' ? (
                <textarea
                  value={editingLesson.lesson.video_url || ''}
                  onChange={(e)=>setEditingLesson(s => s ? { ...s, lesson: { ...s.lesson, video_url: e.target.value } } : s)}
                  rows={4}
                  placeholder='<iframe src="..." ...></iframe>'
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-blue-500"
                />
              ) : (
                <input
                  value={editingLesson.lesson.video_url || ''}
                  onChange={(e)=>setEditingLesson(s => s ? { ...s, lesson: { ...s.lesson, video_url: e.target.value } } : s)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-white/80">Nội dung bài học</label>
              <textarea
                value={editingLesson.lesson.content || ''}
                onChange={(e)=>setEditingLesson(s => s ? { ...s, lesson: { ...s.lesson, content: e.target.value } } : s)}
                rows={8}
                placeholder="Ghi chú bài học, bản ghi, tài liệu hoặc HTML. Hiển thị bên dưới video."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-white/40">Hỗ trợ văn bản thường hoặc HTML. Hiển thị bên dưới video trong trang học.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/80 md:col-span-2">
              <input
                type="checkbox"
                checked={!!editingLesson.lesson.is_preview}
                onChange={(e)=>setEditingLesson(s => s ? { ...s, lesson: { ...s.lesson, is_preview: e.target.checked } } : s)}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              Xem thử miễn phí (hiển thị cho người chưa mua khoá học)
            </label>
          </div>
          <div className="mt-6 flex justify-between gap-2">
            <button onClick={()=>{ deleteLesson(editingLesson.lesson.id); setEditingLesson(null); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
              <Trash2 size={14} /> Xoá
            </button>
            <div className="flex gap-2">
              <button onClick={()=>setEditingLesson(null)} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5">Huỷ</button>
              <button onClick={saveLesson} className="btn-primary rounded-lg px-4 py-2 text-sm font-medium">Lưu bài học</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type='text', placeholder, autoFocus }: { label: string; value: string; onChange: (v: string)=>void; type?: string; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-white/80">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e)=>onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: ()=>void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()}
        className={`glass max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto rounded-2xl p-6 shadow-2xl`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-white/50 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
