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
  toan_quyen?: boolean // AI trả lời mọi tình huống: đứng trước kịch bản từ khóa, không im lặng, không tự dừng
}

// Khách cần người thật: AI im lặng với hội thoại này trong ngần ấy giờ, và gắn thẻ để nhân viên thấy
const GIO_DUNG_KHI_CAN_NGUOI = 12
export const THE_CAN_NGUOI = 'Cần tư vấn'

export type MauTraLoi = { tuKhoa: string[]; traLoi: string }

export function loiDanAi(p: {
  tenTrang: string
  thongTin: string
  cachNoi: string
  loai: 'tin_nhan' | 'binh_luan'
  khachTen?: string | null
  toanQuyen?: boolean
  mau?: MauTraLoi[] // kịch bản từ khóa của shop, dùng làm câu trả lời tham khảo
}) {
  const mau = (p.mau ?? []).filter((m) => m.tuKhoa.length && m.traLoi.trim())
  return `Bạn là nhân viên chăm sóc khách hàng của shop "${p.tenTrang}" trên Facebook, trả lời bằng tiếng Việt.

THÔNG TIN SHOP (chỉ được dùng thông tin này, không bịa thêm):
"""
${p.thongTin.trim() || '(Shop chưa cung cấp thông tin)'}
"""
${
  mau.length
    ? `\nCÂU TRẢ LỜI MẪU CỦA SHOP (khách hỏi đúng ý này thì trả lời theo nội dung mẫu, diễn đạt tự nhiên):\n${mau.map((m) => `- Khi khách hỏi về "${m.tuKhoa.join('", "')}": ${m.traLoi.replace(/\s+/g, ' ')}`).join('\n')}\n`
    : ''
}
CÁCH NÓI CHUYỆN:
${p.cachNoi.trim() || 'Xưng "shop", gọi khách là "bạn". Lịch sự, thân thiện, dùng "dạ", "ạ".'}

QUY TẮC:
- Trả lời ngắn gọn như người thật nhắn tin: 1–3 câu, không dùng markdown, không gạch đầu dòng dài.
- Không bịa giá, khuyến mãi, tồn kho, chính sách nếu THÔNG TIN SHOP không có.
- Khi khách muốn mua: hỏi sản phẩm, size/màu/dung lượng, số lượng, họ tên, số điện thoại, địa chỉ nhận hàng (hỏi những gì còn thiếu).
- Không hứa điều shop không nêu. Không nhắc rằng bạn là AI trừ khi khách hỏi thẳng.
${
  p.toanQuyen
    ? `- Bạn là người duy nhất trả lời khách, LUÔN phải trả lời, không bao giờ để trống. Mọi tình huống đều xử lý:
  · Chào hỏi, cảm ơn, tin ngắn ("alo", "ok", "?") → đáp lại và hỏi khách cần gì.
  · Khách gửi ảnh, sticker → hỏi khách quan tâm sản phẩm nào / cần shop hỗ trợ gì.
  · Câu hỏi ngoài thông tin shop → nói shop ghi nhận và sẽ kiểm tra rồi báo lại khách sớm, xin số điện thoại nếu chưa có.
  · Phàn nàn, đổi trả, hàng lỗi → xin lỗi, xin mã đơn / ảnh sản phẩm / số điện thoại, hứa shop xử lý ngay.
  · Khách gửi đủ thông tin đặt hàng → xác nhận lại đơn và báo shop sẽ gọi xác nhận.
- Đặt can_nguoi_that = true (chỉ để nhân viên theo dõi, bạn vẫn trả lời bình thường) khi: phàn nàn, đổi trả, câu hỏi ngoài thông tin shop, hoặc khách vừa gửi đủ thông tin đặt hàng.`
    : `- Khi không chắc, nói shop sẽ kiểm tra và báo lại ngay, rồi đặt can_nguoi_that = true.
- Đặt can_nguoi_that = true khi: khách phàn nàn, đổi trả, hỏi điều ngoài thông tin shop, muốn gặp người thật, hoặc đã sẵn sàng đặt hàng và gửi đủ thông tin nhận hàng (để nhân viên lên đơn).`
}${
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

export const aiApDung = (cd: CaiDatAi | null, loai: 'tin_nhan' | 'binh_luan') => !!cd?.bat && (cd.ap_dung === 'ca_hai' || cd.ap_dung === loai)

// Thử trả lời theo cài đặt hiện tại (dùng trong trang cài đặt). Không gửi gì cho khách.
export async function thuAi(
  c: Pick<CaiDatAi, 'thong_tin' | 'cach_noi'> & { tenTrang: string; loai: 'tin_nhan' | 'binh_luan'; toanQuyen?: boolean; mau?: MauTraLoi[] },
  hoiThoai: TinHoiThoai[],
) {
  return hoiGemini(loiDanAi({ ...c, thongTin: c.thong_tin, cachNoi: c.cach_noi }), hoiThoai)
}

// Tin không có chữ (ảnh, sticker, tệp): mô tả ngắn để AI hiểu khách vừa gửi gì
function moTaTin(t: { noi_dung: string | null; dinh_kem: { type?: string }[] | null }) {
  const chu = t.noi_dung?.replace(/^\[Nhắn riêng\] /, '').trim()
  if (chu) return chu
  const loai = t.dinh_kem?.[0]?.type
  if (!t.dinh_kem?.length) return ''
  return loai === 'image' ? '[Khách gửi ảnh]' : loai === 'video' ? '[Khách gửi video]' : loai === 'audio' ? '[Khách gửi tin nhắn thoại]' : '[Khách gửi tệp / sticker]'
}

// Webhook gọi để AI trả lời. Trả về câu trả lời, hoặc null nếu AI không nên trả lời lúc này.
export async function traLoiBangAi(p: {
  trangId: string
  tenTrang: string
  loai: 'tin_nhan' | 'binh_luan'
  hoiThoaiId: string
  khachTen?: string | null
  caiDat?: CaiDatAi | null
  mau?: MauTraLoi[]
}) {
  if (!coKhoaGemini()) return null
  const cd = p.caiDat === undefined ? await caiDatAiCuaTrang(p.trangId) : p.caiDat
  if (!cd || !aiApDung(cd, p.loai)) return null
  const toanQuyen = !!cd.toan_quyen

  const { data: ht } = await db().from('hoi_thoai').select('khach_ten, the, ai_tam_dung_den').eq('id', p.hoiThoaiId).maybeSingle()
  // Tạm dừng (nhân viên tự tắt AI với khách này, hoặc AI đã chuyển cho người thật): luôn tôn trọng
  if (ht?.ai_tam_dung_den && new Date(ht.ai_tam_dung_den) > new Date()) return null

  // Nhân viên vừa trả lời (không phải tin tự động): để người thật nói tiếp. Chế độ trả lời mọi tình huống thì bỏ qua.
  if (!toanQuyen && cd.nghi_gio > 0) {
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
    .select('chieu, noi_dung, dinh_kem, tao_luc')
    .eq('hoi_thoai_id', p.hoiThoaiId)
    .order('tao_luc', { ascending: false })
    .limit(20)
  const hoiThoai: TinHoiThoai[] = (tin ?? [])
    .reverse()
    .map((t) => ({ vai: t.chieu === 'vao' ? ('khach' as const) : ('shop' as const), noiDung: moTaTin(t) }))
    .filter((t) => t.noiDung)

  const kq = await hoiGemini(
    loiDanAi({ tenTrang: p.tenTrang, thongTin: cd.thong_tin, cachNoi: cd.cach_noi, loai: p.loai, khachTen: p.khachTen ?? ht?.khach_ten, toanQuyen, mau: p.mau }),
    hoiThoai,
  )
  if (kq.canNguoiThat) {
    // Gắn thẻ cho nhân viên theo dõi; chỉ tạm dừng AI khi không ở chế độ trả lời mọi tình huống
    const the = (ht?.the as string[] | undefined) ?? []
    await db()
      .from('hoi_thoai')
      .update({
        ...(toanQuyen ? {} : { ai_tam_dung_den: new Date(Date.now() + GIO_DUNG_KHI_CAN_NGUOI * 3600_000).toISOString() }),
        ...(the.includes(THE_CAN_NGUOI) ? {} : { the: [...the, THE_CAN_NGUOI] }),
      })
      .eq('id', p.hoiThoaiId)
  }
  return kq.traLoi || null
}
