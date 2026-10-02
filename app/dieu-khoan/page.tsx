import type { Metadata } from 'next'
import Link from 'next/link'
import { TEN_PHAN_MEM } from '@/lib/goiCuoc'
import { TEN } from '@/lib/thongTin'

export const metadata: Metadata = { title: 'Điều khoản sử dụng' }

export default function DieuKhoan() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 leading-relaxed">
      <Link href="/" className="text-sm text-chinh hover:underline">← Trang chủ</Link>
      <h1 className="mt-4 text-3xl font-bold">Điều khoản sử dụng {TEN_PHAN_MEM}</h1>
      <div className="mt-6 grid gap-4 text-phu">
        <p>{TEN_PHAN_MEM} là phần mềm quản lý tin nhắn, bình luận Fanpage do {TEN} cung cấp. Khi đăng nhập và sử dụng, bạn đồng ý với các điều khoản dưới đây.</p>
        <h2 className="mt-2 text-xl font-semibold text-chu">1. Tài khoản</h2>
        <p>Bạn đăng nhập bằng tài khoản Facebook của chính mình và chỉ kết nối những Fanpage bạn có quyền quản trị. Bạn chịu trách nhiệm về mọi hoạt động trên tài khoản và các Page đã kết nối.</p>
        <h2 className="mt-2 text-xl font-semibold text-chu">2. Sử dụng hợp lệ</h2>
        <p>Không dùng phần mềm để gửi tin rác, quảng cáo trái phép, lừa đảo hay nội dung vi phạm pháp luật Việt Nam, Tiêu chuẩn cộng đồng và Chính sách nền tảng của Meta. Phần mềm tuân theo giới hạn của Facebook, ví dụ chỉ nhắn được cho khách trong 24 giờ kể từ tin cuối của khách.</p>
        <h2 className="mt-2 text-xl font-semibold text-chu">3. Gói cước</h2>
        <p>Mỗi gói có giới hạn số Fanpage được quản lý. Gói trả phí hết hạn sẽ tự quay về gói Miễn phí. Chúng tôi có thể thay đổi tính năng và giá các gói, và sẽ thông báo trước cho khách đang dùng gói trả phí.</p>
        <h2 className="mt-2 text-xl font-semibold text-chu">4. Dữ liệu</h2>
        <p>Dữ liệu được thu thập và xử lý theo <Link href="/chinh-sach-bao-mat" className="text-chinh underline">Chính sách bảo mật</Link>. Bạn có thể gỡ Page hoặc yêu cầu xóa dữ liệu bất cứ lúc nào theo <Link href="/xoa-du-lieu" className="text-chinh underline">hướng dẫn xóa dữ liệu</Link>.</p>
        <h2 className="mt-2 text-xl font-semibold text-chu">5. Tạm khóa tài khoản</h2>
        <p>Chúng tôi có thể tạm khóa tài khoản vi phạm các điều khoản này hoặc theo yêu cầu của Meta, cơ quan có thẩm quyền.</p>
        <h2 className="mt-2 text-xl font-semibold text-chu">6. Giới hạn trách nhiệm</h2>
        <p>Phần mềm phụ thuộc vào dịch vụ của Facebook. Chúng tôi không chịu trách nhiệm khi Facebook thay đổi chính sách, giới hạn hoặc tạm ngừng API ngoài khả năng kiểm soát của chúng tôi.</p>
        <p>Mọi thắc mắc, vui lòng liên hệ qua Zalo hoặc email ở cuối trang chủ.</p>
      </div>
    </main>
  )
}
