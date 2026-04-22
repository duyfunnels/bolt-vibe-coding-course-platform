import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatVND } from '@/lib/format';

export const revalidate = 30;

export default async function CoursesPage() {
  const db = supabaseAdmin();
  const { data: courses } = await db
    .from('courses')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10">
          <div className="text-sm text-white/50">Khoá học</div>
          <h1 className="text-4xl font-bold text-white">Khám phá tất cả khoá học</h1>
          <p className="mt-2 text-white/60">Các chương trình được chọn lọc, giảng dạy bởi chuyên gia thực chiến.</p>
        </div>
        {courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.slug}`} className="glass group overflow-hidden rounded-2xl transition hover:-translate-y-1">
                <div className="aspect-video w-full overflow-hidden bg-white/5">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full place-items-center text-white/30">Chưa có ảnh</div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-lg font-semibold text-white">{c.title}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-white/60">{c.subtitle || c.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xl font-bold text-white">{formatVND(c.price)}</div>
                    <span className="text-sm text-blue-400 group-hover:text-blue-300">Chi tiết &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-10 text-center text-white/60">Chưa có khoá học nào được xuất bản.</div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
