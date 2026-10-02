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
        <p>Muốn xem hoặc xóa thông tin của bạn, hãy liên hệ chúng tôi qua Zalo hoặc email ở cuối trang chủ.</p>
      </div>
    </main>
  )
}
