import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-black/30">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-orange-500">
              <GraduationCap size={18} />
            </div>
            <span className="text-lg font-semibold">Northlight</span>
          </div>
          <p className="mt-3 text-sm text-white/60">Khoá học trực tuyến cao cấp với truy cập trọn đời.</p>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold text-white">Sản phẩm</div>
          <ul className="space-y-2 text-sm text-white/60">
            <li><Link href="/courses">Khoá học</Link></li>
            <li><Link href="/#pricing">Bảng giá</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold text-white">Công ty</div>
          <ul className="space-y-2 text-sm text-white/60">
            <li><Link href="/#features">Giới thiệu</Link></li>
            <li><Link href="/#contact">Liên hệ</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold text-white">Tài khoản</div>
          <ul className="space-y-2 text-sm text-white/60">
            <li><Link href="/login">Đăng nhập</Link></li>
            <li><Link href="/register">Tạo tài khoản</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-white/40">
        &copy; {new Date().getFullYear()} Northlight Academy. Bản quyền đã được bảo hộ.
      </div>
    </footer>
  );
}
