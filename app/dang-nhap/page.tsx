import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { nguoiDungId } from '@/lib/phien'
import { TEN } from '@/lib/thongTin'

export const metadata: Metadata = { title: 'Đăng nhập quản lý Fanpage', robots: { index: false } }

export default async function DangNhap({ searchParams }: PageProps<'/dang-nhap'>) {
  if (await nguoiDungId()) redirect('/quan-ly')
  const { loi } = await searchParams
  return (
    <main className="flex flex-1 items-center justify-center bg-nen px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-lg font-extrabold text-chinh-dam">
          Công Nghệ 24H<span className="text-nhan"> Media</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold">Quản lý Fanpage</h1>
        <p className="mt-2 text-phu">
          Gom tin nhắn và bình luận của mọi Fanpage về một hộp thư, tự ẩn bình luận có số điện thoại, trả lời nhanh bằng mẫu câu.
        </p>
        {typeof loi === 'string' && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loi}</p>}
        <a
          href="/api/fb/dang-nhap"
          className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-[#1877f2] px-4 py-3 font-semibold text-white hover:bg-[#166fe5]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
          </svg>
          Đăng nhập bằng Facebook
        </a>
        <p className="mt-4 text-xs text-phu">
          {TEN} chỉ dùng quyền bạn cấp để đọc và trả lời tin nhắn, bình luận trên các Page bạn chọn. Không lưu mật khẩu Facebook.
          Xem <Link href="/chinh-sach-bao-mat" className="underline">chính sách bảo mật</Link>.
        </p>
      </div>
    </main>
  )
}
