import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatVND } from '@/lib/format';
import { CircleCheck as CheckCircle2, CirclePlay as PlayCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const db = supabaseAdmin();
  const { data: course } = await db.from('courses').select('*').eq('slug', params.slug).maybeSingle();
  if (!course) notFound();

  const { data: modules } = await db
    .from('modules')
    .select('id, title, position, lessons:lessons(id,title,position,is_preview)')
    .eq('course_id', course.id)
    .order('position', { ascending: true });

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="text-sm text-blue-400">Khoá học</div>
            <h1 className="mt-2 text-4xl font-bold text-white">{course.title}</h1>
            <p className="mt-3 text-lg text-white/70">{course.subtitle}</p>
            <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-white/30">Chưa có ảnh</div>
              )}
            </div>
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white">Giới thiệu khoá học</h2>
              <p className="mt-3 whitespace-pre-line text-white/70">{course.description}</p>
            </div>
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-white">Chương trình học</h2>
              <div className="mt-4 space-y-3">
                {modules && modules.length > 0 ? modules.map((m: any) => (
                  <div key={m.id} className="glass rounded-xl p-5">
                    <div className="font-semibold text-white">{m.title}</div>
                    <ul className="mt-3 space-y-2 text-sm text-white/70">
                      {(m.lessons || [])
                        .sort((a: any, b: any) => a.position - b.position)
                        .map((l: any) => (
                          <li key={l.id} className="flex items-center gap-2">
                            <PlayCircle size={14} className="text-blue-400" />
                            <span>{l.title}</span>
                            {l.is_preview && <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">PREVIEW</span>}
                          </li>
                      ))}
                    </ul>
                  </div>
                )) : <div className="text-white/50">Chương trình học sắp ra mắt.</div>}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="glass glow-blue rounded-2xl p-6">
              <div className="text-sm text-white/60">Thanh toán một lần</div>
              <div className="mt-1 text-3xl font-bold text-white">{formatVND(course.price)}</div>
              <Link href={`/checkout/${course.slug}`} className="btn-accent mt-6 block rounded-xl px-5 py-3 text-center font-medium">
                Đăng ký ngay
              </Link>
              <ul className="mt-6 space-y-2 text-sm text-white/70">
                {['Truy cập trọn đời', 'Chứng chỉ hoàn thành', 'Tham gia cộng đồng', 'Bảo hành 30 ngày'].map((x)=> (
                  <li key={x} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-400" /> {x}</li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
