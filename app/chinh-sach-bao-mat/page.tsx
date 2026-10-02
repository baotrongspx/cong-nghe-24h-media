import type { Metadata } from 'next'
import Link from 'next/link'
import { TEN } from '@/lib/thongTin'

export const metadata: Metadata = { title: 'Chính sách bảo mật' }

export default function BaoMat() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 leading-relaxed">
      <Link href="/" className="text-sm text-chinh hover:underline">← Trang chủ</Link>
      <h1 className="mt-4 text-3xl font-bold">Chính sách bảo mật</h1>
      <div className="mt-6 grid gap-4 text-phu">
        <p>{TEN} thu thập họ tên, số điện thoại và thông tin doanh nghiệp bạn điền vào form đăng ký tư vấn.</p>
        <p>Thông tin chỉ dùng để liên hệ tư vấn, báo giá và thực hiện hợp đồng dịch vụ. Chúng tôi không bán hay chia sẻ cho bên thứ ba.</p>
        <p>Với khách hàng sử dụng dịch vụ, chúng tôi chỉ truy cập Fanpage, Zalo OA, TikTok qua quyền quản trị bạn cấp. Bạn có thể gỡ quyền bất cứ lúc nào.</p>
        <h2 className="mt-4 text-xl font-semibold text-chu">Phần mềm quản lý Fanpage 24H Page</h2>
        <p>Khi bạn đăng nhập bằng Facebook, chúng tôi nhận tên, ảnh đại diện, danh sách Fanpage bạn chọn cấp quyền và mã truy cập của các Page đó. Chúng tôi không nhận và không lưu mật khẩu Facebook.</p>
        <p>Phần mềm lưu tin nhắn, bình luận gửi tới các Page đã kết nối (kể cả số điện thoại khách tự gửi) để hiển thị trong hộp thư, ẩn bình luận và trả lời tự động theo cài đặt của bạn. Dữ liệu của Page chỉ người quản lý Page đó trên phần mềm xem được.</p>
        <p>Bạn có thể gỡ Page trong mục Fanpage của phần mềm hoặc gỡ ứng dụng trong cài đặt Facebook bất cứ lúc nào. Xem thêm <Link href="/xoa-du-lieu" className="text-chinh underline">hướng dẫn xóa dữ liệu</Link>.</p>
        <p>Muốn xem hoặc xóa thông tin của bạn, hãy liên hệ chúng tôi qua Zalo hoặc email ở cuối trang chủ.</p>
      </div>
    </main>
  )
}
