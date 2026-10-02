import type { Metadata } from 'next'
import Link from 'next/link'
import { TEN } from '@/lib/thongTin'

export const metadata: Metadata = { title: 'Hướng dẫn xóa dữ liệu' }

// Meta yêu cầu app có trang hướng dẫn xóa dữ liệu người dùng (Data Deletion Instructions URL)
export default function XoaDuLieu() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 leading-relaxed">
      <Link href="/" className="text-sm text-chinh hover:underline">← Trang chủ</Link>
      <h1 className="mt-4 text-3xl font-bold">Hướng dẫn xóa dữ liệu</h1>
      <div className="mt-6 grid gap-4 text-phu">
        <p>Khi bạn đăng nhập công cụ quản lý Fanpage của {TEN} bằng Facebook, chúng tôi lưu tên, ảnh đại diện, danh sách Page bạn quản lý cùng tin nhắn và bình luận của các Page đó.</p>
        <p>Để xóa: trong trang Quản lý → Fanpage, bấm “Gỡ” với từng Page; hoặc vào Facebook → Cài đặt → Ứng dụng và trang web → gỡ ứng dụng của chúng tôi.</p>
        <p>Muốn xóa toàn bộ dữ liệu ngay, hãy liên hệ chúng tôi qua Zalo hoặc email ở cuối trang chủ. Chúng tôi xóa trong vòng 7 ngày làm việc.</p>
      </div>
    </main>
  )
}
