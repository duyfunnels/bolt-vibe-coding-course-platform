'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { VideoPlayer } from '@/components/video-player';
import Link from 'next/link';
import { CircleCheck as CheckCircle2, GraduationCap, CirclePlay as PlayCircle, Lock } from 'lucide-react';

export default function LearnPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace(`/login?redirect=/learn/${params.slug}`);
      setUserId(u.user.id);

      const { data: c } = await supabase.from('courses').select('*').eq('slug', params.slug).maybeSingle();
      if (!c) return router.replace('/courses');
      setCourse(c);

      const { data: uc } = await supabase
        .from('user_courses')
        .select('id')
        .eq('user_id', u.user.id)
        .eq('course_id', c.id)
        .maybeSingle();
      if (!uc) return router.replace(`/courses/${params.slug}`);
      setHasAccess(true);

      const { data: mods } = await supabase
        .from('modules')
        .select('id,title,position,lessons:lessons(id,title,position,video_provider,video_url,content,is_preview)')
        .eq('course_id', c.id)
        .order('position');
      const sorted = (mods || []).map((m: any) => ({
        ...m,
        lessons: (m.lessons || []).sort((a: any, b: any) => a.position - b.position),
      }));
      setModules(sorted);
      const first = sorted.flatMap((m: any) => m.lessons)[0];
      if (first) setActiveLesson(first);

      const { data: prog } = await supabase.from('lesson_progress').select('lesson_id,completed').eq('user_id', u.user.id);
      const map: Record<string, boolean> = {};
      (prog || []).forEach((p: any) => { map[p.lesson_id] = p.completed; });
      setProgress(map);
    })();
  }, [params.slug, router]);

  const markComplete = async () => {
    if (!activeLesson || !userId) return;
    await supabase.from('lesson_progress').upsert(
      { user_id: userId, lesson_id: activeLesson.id, completed: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
    setProgress((p) => ({ ...p, [activeLesson.id]: true }));
  };

  if (!hasAccess || !course) {
    return <main className="grid min-h-screen place-items-center text-white/60">Đang tải...</main>;
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[320px_1fr]">
      <aside className="border-r border-white/5 bg-black/40 lg:min-h-screen">
        <div className="flex items-center gap-2 border-b border-white/5 p-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-white">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-orange-500">
              <GraduationCap size={14} />
            </div>
            <span className="font-semibold">{course.title}</span>
          </Link>
        </div>
        <div className="p-3">
          {modules.map((m) => (
            <div key={m.id} className="mb-3">
              <div className="px-2 py-1 text-xs uppercase tracking-wide text-white/50">{m.title}</div>
              <ul className="mt-1 space-y-1">
                {m.lessons.map((l: any) => {
                  const active = activeLesson?.id === l.id;
                  const done = progress[l.id];
                  return (
                    <li key={l.id}>
                      <button
                        onClick={()=>setActiveLesson(l)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${active ? 'bg-blue-500/15 text-white' : 'text-white/70 hover:bg-white/5'}`}
                      >
                        {done ? <CheckCircle2 size={14} className="text-green-400" /> : <PlayCircle size={14} className="text-white/40" />}
                        <span className="truncate">{l.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
      <main className="p-6 lg:p-10">
        {activeLesson ? (
          <>
            <div className="mb-4 text-sm text-white/50">Đang học</div>
            <h1 className="mb-4 text-2xl font-bold text-white">{activeLesson.title}</h1>
            <VideoPlayer provider={activeLesson.video_provider} url={activeLesson.video_url} />
            {activeLesson.content && activeLesson.content.trim() && (
              <article
                className="prose prose-invert mt-8 max-w-none rounded-xl border border-white/10 bg-white/[0.02] p-6 text-white/80 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: activeLesson.content }}
              />
            )}
            <div className="mt-6 flex items-center gap-3">
              <button onClick={markComplete} className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium">
                {progress[activeLesson.id] ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-white/60 flex items-center gap-2"><Lock size={14} /> Chọn bài học từ thanh bên.</div>
        )}
      </main>
    </div>
  );
}
