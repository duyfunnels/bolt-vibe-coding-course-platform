import Link from 'next/link';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { formatVND } from '@/lib/format';
import { ArrowRight, Sparkles, Shield, Zap, CirclePlay as PlayCircle, Users, Star, CircleCheck as CheckCircle2 } from 'lucide-react';

export const revalidate = 60;

export default async function Home() {
  const db = supabaseAdmin();
  const { data: courses } = await db
    .from('courses')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <>
      <SiteNav />
      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 pb-20 pt-24 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <Sparkles size={14} className="text-orange-400" />
              Khoá học mới khai giảng tháng này
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-tight text-white md:text-6xl">
              Làm chủ kỹ năng thiết yếu với{' '}
              <span className="grad-text">khoá học trực tuyến cao cấp</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
              Học cùng chuyên gia trong ngành, thực hành dự án thật, truy cập trọn đời và cộng đồng đồng hành cùng bạn.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/courses" className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium">
                Khám phá khoá học <ArrowRight size={18} />
              </Link>
              <Link href="#features" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium text-white/80 hover:text-white">
                <PlayCircle size={18} /> Xem giới thiệu
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/50">
              <div className="flex items-center gap-2"><Users size={16} /> 12.000+ học viên</div>
              <div className="flex items-center gap-2"><Star size={16} className="text-orange-400" /> 4.9 điểm đánh giá</div>
              <div className="flex items-center gap-2"><Shield size={16} /> Bảo hành 30 ngày</div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Zap, title: 'Học qua thực hành', desc: 'Mỗi bài học kết thúc bằng một dự án thực tế bạn có thể hoàn thiện.' },
              { icon: Shield, title: 'Truy cập trọn đời', desc: 'Thanh toán một lần, giữ quyền truy cập mãi mãi, kèm cập nhật mới.' },
              { icon: Users, title: 'Cộng đồng riêng', desc: 'Hỗ trợ từ bạn học và giảng viên giúp bạn gỡ rối nhanh chóng.' },
            ].map((f, i) => (
              <div key={i} className="glass rounded-2xl p-6">
                <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${i===1?'bg-orange-500/15 text-orange-400':'bg-blue-500/15 text-blue-400'}`}>
                  <f.icon size={20} />
                </div>
                <div className="text-lg font-semibold text-white">{f.title}</div>
                <p className="mt-1 text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="text-sm text-white/50">Nổi bật</div>
              <h2 className="text-3xl font-bold text-white">Bắt đầu với khoá học bán chạy</h2>
            </div>
            <Link href="/courses" className="text-sm text-blue-400 hover:text-blue-300">Xem tất cả &rarr;</Link>
          </div>
          {courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {courses.map((c) => (
                <Link key={c.id} href={`/courses/${c.slug}`} className="glass group overflow-hidden rounded-2xl transition hover:-translate-y-1">
                  <div className="aspect-video w-full overflow-hidden bg-white/5">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-white/30">No thumbnail</div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="text-lg font-semibold text-white">{c.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-white/60">{c.subtitle || c.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-white"><span className="text-xl font-bold">{formatVND(c.price)}</span></div>
                      <span className="text-sm text-blue-400 group-hover:text-blue-300">Đăng ký &rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-10 text-center text-white/60">
              Chưa có khoá học nào. Quản trị viên có thể thêm khoá học từ trang quản trị.
            </div>
          )}
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
          <div className="glass glow-blue grid grid-cols-1 gap-8 rounded-3xl p-10 md:grid-cols-2">
            <div>
              <h3 className="text-3xl font-bold text-white">Tất cả những gì bạn cần để bứt phá</h3>
              <p className="mt-3 text-white/70">Thanh toán một lần. Không đăng ký định kỳ. Truy cập đầy đủ mọi cập nhật hiện tại và tương lai.</p>
              <ul className="mt-6 space-y-3 text-white/80">
                {['Video bài giảng chất lượng cao', 'Dự án thực hành', 'Chứng chỉ hoàn thành', 'Tham gia cộng đồng', 'Cập nhật trọn đời'].map((x)=> (
                  <li key={x} className="flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-400" /> {x}</li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <Link href="/courses" className="btn-accent inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium">
                Xem tất cả khoá học <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
