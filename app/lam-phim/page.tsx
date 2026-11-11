import { connection } from 'next/server'
import { coKhoaGemini } from '@/lib/gemini'
import { coMatKhau, daMoKhoa } from '@/lib/khoa'
import FormMatKhau from './FormMatKhau'
import XuongPhim from './XuongPhim'

// Giọng đọc cho một đoạn dài có thể mất gần một phút
export const maxDuration = 60

export default async function LamPhim() {
  // Luôn dựng trang lúc có người mở (không dựng sẵn lúc build) để đọc mật khẩu và khóa Gemini hiện hành
  await connection()
  if (!coMatKhau())
    return (
      <p className="mx-auto mt-16 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Trang chưa được đặt mật khẩu. Chủ trang vào Vercel → Settings → Environment Variables, thêm biến <b>MAT_KHAU_LAM_PHIM</b> (ít nhất 6 ký tự) rồi Redeploy.
      </p>
    )
  if (!(await daMoKhoa())) return <FormMatKhau />
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="font-extrabold text-chinh-dam">
        Công Nghệ 24H<span className="text-nhan"> Media</span>
      </p>
      <h1 className="mt-4 text-2xl font-bold">Làm phim hoạt hình kể chuyện</h1>
      <p className="mt-1 text-sm text-phu">
        Viết bảng cảnh, chép câu lệnh để vẽ ảnh bằng Gemini, tải ảnh lên rồi dựng thành video ngang 16:9 có giọng đọc và phụ đề để đăng YouTube. Mỗi lần làm một mẩu chuyện khoảng 2
        phút; muốn video dài thì làm nhiều mẩu rồi nối lại trong CapCut.
      </p>
      <XuongPhim coAi={coKhoaGemini()} />
    </div>
  )
}
