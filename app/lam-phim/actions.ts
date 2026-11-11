'use server'

import { revalidatePath } from 'next/cache'
import { goiGeminiJson } from '@/lib/gemini'
import { GIONG, docThanhGiong } from '@/lib/giongNoi'
import { daMoKhoa, moKhoa } from '@/lib/khoa'

const CHUA_MO = 'Trang đang khóa, hãy tải lại trang và nhập mật khẩu'

// Nhập mật khẩu mở trang. Sai thì chờ một nhịp để không dò mật khẩu nhanh được.
export async function nhapMatKhau(_truoc: string | null, form: FormData): Promise<string | null> {
  if (!(await moKhoa(String(form.get('mat_khau') ?? '')))) {
    await new Promise((xong) => setTimeout(xong, 1200))
    return 'Mật khẩu chưa đúng'
  }
  revalidatePath('/lam-phim')
  return null
}

// Bộ quy tắc thể loại: hoạt hình 2D chibi, hài kể chuyện đời thường. AI viết bảng cảnh phải theo đúng các điều này.
const QUY_TAC = `Bạn là đạo diễn kiêm biên kịch phim hoạt hình 2D chibi, thể loại HÀI KỂ CHUYỆN ĐỜI THƯỜNG Việt Nam.
Nhiệm vụ: từ ý chính người dùng đưa, viết bảng cảnh cho MỘT mẩu chuyện ngắn.

Quy tắc thể loại (không được đổi sang thể loại khác):
- Nhân vật chính tự kể ở ngôi thứ nhất ("tôi"), giọng tự giễu, gần gũi. Chỉ có MỘT giọng đọc toàn bộ, nên lời thoại của người khác phải viết lồng vào lời kể (ví dụ: Vợ tôi bảo: "...").
- Cấu trúc: câu mở gây tò mò → đặt tình huống → sự cố → leo thang → cú lật bất ngờ → câu chốt. Chi tiết cài ở đầu phải được trả lại ở cuối.
- Câu ngắn, dễ đọc thành tiếng, cứ 2-3 cảnh có một chỗ gây cười. Không giảng đạo lý dài dòng.
- Mỗi cảnh đọc trong khoảng 8-12 giây: "loi" dài 20-40 từ.
- Mỗi cảnh phải đẩy câu chuyện đi tiếp; không có cảnh minh họa chung chung.

Quy tắc cho "hinh" (mô tả để AI khác vẽ một ảnh tĩnh):
- Tả đúng điều đang được kể trong "loi": ai có mặt, đang làm gì, biểu cảm gì, ở đâu, đồ vật nào được nhắc tới.
- Gọi nhân vật bằng đúng TÊN trong danh sách nhân vật, không tả lại ngoại hình hay quần áo của họ.
- Biểu cảm phóng đại kiểu hoạt hình (hóa đá, mắt lấp lánh, nước mắt chảy dài...). Mỗi cảnh một cảm xúc rõ.
- Nêu cỡ cảnh khi cần: cận mặt, trung cảnh, toàn cảnh.
- Không yêu cầu chữ trong ảnh. Không dùng tên người thật, người nổi tiếng hay nhãn hiệu thật.

Viết tiếng Việt có dấu đầy đủ.`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    ten: { type: 'STRING', description: 'Tên mẩu chuyện, ngắn gọn, gây tò mò' },
    canh: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          loi: { type: 'STRING', description: 'Lời giọng đọc sẽ đọc trong cảnh này' },
          hinh: { type: 'STRING', description: 'Mô tả ảnh cần vẽ cho cảnh này' },
        },
        required: ['loi', 'hinh'],
      },
    },
  },
  required: ['ten', 'canh'],
}

export type BangCanh = { ok: true; ten: string; canh: { loi: string; hinh: string }[] } | { ok: false; thongBao: string }

export async function vietBangCanh(yChinh: string, soCanh: number, nhanVat: { ten: string; moTa: string }[]): Promise<BangCanh> {
  if (!(await daMoKhoa())) return { ok: false, thongBao: CHUA_MO }
  const y = yChinh.trim().slice(0, 3000)
  if (y.length < 20) return { ok: false, thongBao: 'Hãy kể ý chính câu chuyện dài hơn một chút (ít nhất vài câu)' }
  const so = Math.min(14, Math.max(4, Math.round(soCanh) || 10))
  const ds = nhanVat
    .filter((n) => n.ten.trim())
    .slice(0, 8)
    .map((n) => `- ${n.ten.trim().slice(0, 40)}: ${n.moTa.trim().slice(0, 300)}`)
    .join('\n')
  try {
    const chu = await goiGeminiJson(
      QUY_TAC,
      [{ role: 'user', parts: [{ text: `Danh sách nhân vật (nhân vật đầu tiên là người kể):\n${ds || '(chưa có, hãy tự đặt 2-3 nhân vật)'}\n\nÝ chính câu chuyện:\n${y}\n\nViết đúng ${so} cảnh.` }] }],
      SCHEMA,
      0.9,
    )
    const kq = JSON.parse(chu) as { ten?: string; canh?: { loi?: string; hinh?: string }[] }
    const canh = (kq.canh ?? [])
      .map((c) => ({ loi: (c.loi ?? '').trim().slice(0, 600), hinh: (c.hinh ?? '').trim().slice(0, 600) }))
      .filter((c) => c.loi)
      .slice(0, 20)
    if (!canh.length) return { ok: false, thongBao: 'AI chưa viết được cảnh nào, hãy bấm thử lại' }
    // Mô hình nhẹ đôi khi trả chữ không dấu: báo để viết lại thay vì dựng phim với lời sai
    const tatCa = canh.map((c) => c.loi).join(' ')
    if (!/[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i.test(tatCa)) return { ok: false, thongBao: 'AI trả về chữ không dấu, hãy bấm thử lại' }
    return { ok: true, ten: (kq.ten ?? '').trim().slice(0, 100), canh }
  } catch (e) {
    return { ok: false, thongBao: e instanceof Error ? e.message : 'AI viết kịch bản lỗi' }
  }
}

// Đọc một đoạn lời (gồm vài cảnh liền nhau) thành giọng nói. Mỗi lần gọi tốn 1 lượt giọng Gemini.
export async function docDoanPhim(chu: string, giong: string): Promise<{ ok: true; amThanh: string } | { ok: false; thongBao: string }> {
  if (!(await daMoKhoa())) return { ok: false, thongBao: CHUA_MO }
  if (!GIONG.some(([ma]) => ma === giong) || giong === 'may') return { ok: false, thongBao: 'Giọng không hợp lệ' }
  const sach = chu.trim().slice(0, 1500)
  if (!sach) return { ok: false, thongBao: 'Chưa có lời để đọc' }
  try {
    return { ok: true, amThanh: await docThanhGiong(sach, giong, 55_000) }
  } catch (e) {
    return { ok: false, thongBao: e instanceof Error ? e.message : 'Lỗi tạo giọng đọc' }
  }
}
