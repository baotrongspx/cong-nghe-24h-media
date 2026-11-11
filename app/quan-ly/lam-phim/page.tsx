import { coKhoaGemini } from '@/lib/gemini'
import XuongPhim from './XuongPhim'

// Giọng đọc cho một đoạn dài có thể mất gần một phút
export const maxDuration = 60

export default function LamPhim() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Làm phim hoạt hình kể chuyện</h1>
        <p className="mt-1 text-sm text-phu">
          Viết bảng cảnh, chép câu lệnh để vẽ ảnh bằng Gemini, tải ảnh lên rồi dựng thành video ngang 16:9 có giọng đọc và phụ đề để đăng YouTube. Mỗi lần làm một mẩu chuyện
          khoảng 2 phút; muốn video dài thì làm nhiều mẩu rồi nối lại trong CapCut.
        </p>
        <XuongPhim coAi={coKhoaGemini()} />
      </div>
    </div>
  )
}
