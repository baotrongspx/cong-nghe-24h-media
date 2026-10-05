import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { coKhoaGemini } from '@/lib/gemini'
import { batBuocDangNhap } from '@/lib/phien'
import QuanLyLive, { type Phien } from './QuanLyLive'

export default async function TrangLiveAi() {
  const { nguoiDung, trangChu } = await batBuocDangNhap()
  const [{ data: dsPhien, error }, { data: dsAi }, { data: dsTrang }, h] = await Promise.all([
    db().from('phien_live').select('*').eq('nguoi_dung_id', nguoiDung.id).order('tao_luc', { ascending: false }),
    db().from('tro_ly_ai').select('thong_tin').in('trang_id', trangChu),
    db().from('fb_trang').select('ten').in('id', trangChu).limit(1),
    headers(),
  ])
  // Link sân khấu và lệnh chạy dùng đúng tên miền đang truy cập
  const goc = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`
  // Điền sẵn thông tin shop từ cài đặt Trợ lý AI (nếu có)
  const thongTin = ((dsAi ?? []) as { thong_tin: string }[]).find((x) => x.thong_tin.trim())?.thong_tin ?? ''

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Live AI</h1>
          <p className="mt-1 text-sm text-phu">
            MC ảo tự dẫn livestream: giới thiệu sản phẩm, đọc bình luận và trả lời người xem bằng giọng nói. Chạy trên máy tính Windows với OBS, phát lên TikTok.
          </p>
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Lưu ý: TikTok yêu cầu ghi rõ nội dung do AI tạo và có thể hạn chế live không có người thật. Việc đọc bình luận TikTok dùng thư viện không chính thức, có thể ngừng chạy khi TikTok thay đổi.
          </p>
        </header>
        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Chưa có bảng Live AI ({error.message}). Hãy chạy lại file <b>supabase/schema.sql</b> trong Supabase → SQL Editor.
          </p>
        ) : (
          <QuanLyLive ds={(dsPhien ?? []) as Phien[]} goc={goc} macDinh={{ ten: dsTrang?.[0]?.ten ?? '', thongTin }} coKhoa={coKhoaGemini()} />
        )}
      </div>
    </div>
  )
}
