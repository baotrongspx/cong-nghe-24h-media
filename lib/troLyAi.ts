import 'server-only'
import { db } from '@/lib/db'
import { coKhoaGemini, hoiGemini, type TinHoiThoai } from '@/lib/gemini'

export type CaiDatAi = {
  trang_id: string
  bat: boolean
  ap_dung: 'tin_nhan' | 'binh_luan' | 'ca_hai'
  thong_tin: string
  cach_noi: string
  nghi_gio: number
}

// Khách cần người thật: AI im lặng với hội thoại này trong ngần ấy giờ, và gắn thẻ để nhân viên thấy
const GIO_DUNG_KHI_CAN_NGUOI = 12
export const THE_CAN_NGUOI = 'Cần tư vấn'

export function loiDanAi(p: { tenTrang: string; thongTin: string; cachNoi: string; loai: 'tin_nhan' | 'binh_luan'; khachTen?: string | null }) {
  return `Bạn là nhân viên chăm sóc khách hàng của shop "${p.tenTrang}" trên Facebook, trả lời bằng tiếng Việt.

THÔNG TIN SHOP (chỉ được dùng thông tin này, không bịa thêm):
"""
${p.thongTin.trim() || '(Shop chưa cung cấp thông tin)'}
"""

CÁCH NÓI CHUYỆN:
${p.cachNoi.trim() || 'Xưng "shop", gọi khách là "bạn". Lịch sự, thân thiện, dùng "dạ", "ạ".'}

QUY TẮC:
- Trả lời ngắn gọn như người thật nhắn tin: 1–3 câu, không dùng markdown, không gạch đầu dòng dài.
- Không bịa giá, khuyến mãi, tồn kho, chính sách nếu THÔNG TIN SHOP không có. Khi không chắc, nói shop sẽ kiểm tra và báo lại ngay, rồi đặt can_nguoi_that = true.
- Đặt can_nguoi_that = true khi: khách phàn nàn, đổi trả, hỏi điều ngoài thông tin shop, muốn gặp người thật, hoặc đã sẵn sàng đặt hàng và gửi đủ thông tin nhận hàng (để nhân viên lên đơn).
- Khi khách muốn mua: hỏi sản phẩm, size/màu, số lượng, họ tên, số điện thoại, địa chỉ nhận hàng (hỏi những gì còn thiếu).
- Không hứa điều shop không nêu. Không nhắc rằng bạn là AI trừ khi khách hỏi thẳng.${
    p.loai === 'binh_luan'
      ? '\n- Đây là trả lời CÔNG KHAI dưới bình luận: thật ngắn (1–2 câu), không ghi giá chi tiết, số điện thoại hay địa chỉ của khách; mời khách nhắn tin cho shop để được tư vấn.'
      : ''
  }${p.khachTen ? `\n- Tên khách: ${p.khachTen}.` : ''}

Trả về JSON: {"tra_loi": "...", "can_nguoi_that": true/false}.`
}

// Cài đặt AI của Page (null nếu chưa có bảng / chưa bật)
export async function caiDatAiCuaTrang(trangId: string) {
  const { data, error } = await db().from('tro_ly_ai').select('*').eq('trang_id', trangId).maybeSingle<CaiDatAi>()
  return error ? null : data
}

// Thử trả lời theo cài đặt hiện tại (dùng trong trang cài đặt). Không gửi gì cho khách.
export async function thuAi(c: Pick<CaiDatAi, 'thong_tin' | 'cach_noi'> & { tenTrang: string; loai: 'tin_nhan' | 'binh_luan' }, hoiThoai: TinHoiThoai[]) {
  return hoiGemini(loiDanAi({ ...c, thongTin: c.thong_tin, cachNoi: c.cach_noi }), hoiThoai)
}

// Webhook gọi khi không khớp kịch bản từ khóa. Trả về câu trả lời, hoặc null nếu AI không nên trả lời lúc này.
export async function traLoiBangAi(p: { trangId: string; tenTrang: string; loai: 'tin_nhan' | 'binh_luan'; hoiThoaiId: string; khachTen?: string | null }) {
  if (!coKhoaGemini()) return null
  const cd = await caiDatAiCuaTrang(p.trangId)
  if (!cd?.bat || (cd.ap_dung !== 'ca_hai' && cd.ap_dung !== p.loai)) return null

  const { data: ht } = await db().from('hoi_thoai').select('khach_ten, the, ai_tam_dung_den').eq('id', p.hoiThoaiId).maybeSingle()
  if (ht?.ai_tam_dung_den && new Date(ht.ai_tam_dung_den) > new Date()) return null

  // Nhân viên vừa trả lời (không phải tin tự động): để người thật nói tiếp
  if (cd.nghi_gio > 0) {
    const tu = new Date(Date.now() - cd.nghi_gio * 3600_000).toISOString()
    const { count } = await db()
      .from('tin')
      .select('id', { count: 'exact', head: true })
      .eq('hoi_thoai_id', p.hoiThoaiId)
      .eq('chieu', 'ra')
      .eq('tu_dong', false)
      .gte('tao_luc', tu)
    if (count) return null
  }

  const { data: tin } = await db()
    .from('tin')
    .select('chieu, noi_dung, tao_luc')
    .eq('hoi_thoai_id', p.hoiThoaiId)
    .not('noi_dung', 'is', null)
    .order('tao_luc', { ascending: false })
    .limit(20)
  const hoiThoai: TinHoiThoai[] = (tin ?? [])
    .reverse()
    .filter((t) => t.noi_dung?.trim())
    .map((t) => ({ vai: t.chieu === 'vao' ? 'khach' : 'shop', noiDung: (t.noi_dung as string).replace(/^\[Nhắn riêng\] /, '') }))

  const kq = await hoiGemini(loiDanAi({ tenTrang: p.tenTrang, thongTin: cd.thong_tin, cachNoi: cd.cach_noi, loai: p.loai, khachTen: p.khachTen ?? ht?.khach_ten }), hoiThoai)
  if (kq.canNguoiThat) {
    const the = (ht?.the as string[] | undefined) ?? []
    await db()
      .from('hoi_thoai')
      .update({
        ai_tam_dung_den: new Date(Date.now() + GIO_DUNG_KHI_CAN_NGUOI * 3600_000).toISOString(),
        ...(the.includes(THE_CAN_NGUOI) ? {} : { the: [...the, THE_CAN_NGUOI] }),
      })
      .eq('id', p.hoiThoaiId)
  }
  return kq.traLoi || null
}
