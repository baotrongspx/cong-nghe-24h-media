import 'server-only'
import { db } from '@/lib/db'
import { tien } from '@/lib/donHang'
import { goiGeminiJson } from '@/lib/gemini'
import { docThanhGiong } from '@/lib/giongNoi'

export type SanPhamLive = { ten: string; gia: number; anh: string; mo_ta: string }
export type PhienLive = {
  id: string
  ma: string
  nguoi_dung_id: string
  ten: string
  tiktok: string
  thong_tin: string
  cach_noi: string
  loi_mo_dau: string
  giong: string
  san_pham: SanPhamLive[]
}

export async function layPhienTheoMa(ma: string) {
  if (!/^[\w-]{16,64}$/.test(ma)) return null
  const { data } = await db().from('phien_live').select('*').eq('ma', ma).maybeSingle<PhienLive>()
  return data
}

// Bình luận mới nhất để hiện trên sân khấu
export async function binhLuanGanDay(phienId: string) {
  const { data } = await db().from('live_binh_luan').select('id, ten, noi_dung').eq('phien_id', phienId).order('id', { ascending: false }).limit(6)
  return ((data ?? []) as { id: number; ten: string; noi_dung: string }[]).reverse()
}

const SCHEMA_LUOT = {
  type: 'OBJECT',
  properties: {
    loi_noi: { type: 'STRING', description: 'Lời người dẫn nói tiếp, văn nói, 2–4 câu, tối đa 60 từ' },
    san_pham: { type: 'INTEGER', description: 'Số thứ tự sản phẩm đang nói tới (bắt đầu từ 1), 0 nếu không nói về sản phẩm cụ thể' },
  },
  required: ['loi_noi', 'san_pham'],
}

function loiDan(p: PhienLive) {
  const sp = p.san_pham.map((x, i) => `${i + 1}. ${x.ten} — ${x.gia ? tien(x.gia) : 'liên hệ'}${x.mo_ta ? `. ${x.mo_ta}` : ''}`).join('\n')
  return `Bạn là người dẫn livestream bán hàng (MC ảo) của shop "${p.ten || 'shop'}" trên TikTok, nói tiếng Việt.

SẢN PHẨM ĐANG BÁN:
${sp || '(chưa có sản phẩm)'}

THÔNG TIN SHOP (chỉ dùng thông tin này, không bịa giá, khuyến mãi, tồn kho):
"""
${p.thong_tin.trim() || '(không có)'}
"""

CÁCH NÓI: ${p.cach_noi.trim() || 'Xưng "em", gọi người xem là "cả nhà" hoặc tên khách. Năng lượng, vui vẻ, thân thiện như MC bán hàng chuyên nghiệp.'}

QUY TẮC:
- Đây là lời NÓI sẽ được đọc thành giọng: câu ngắn, tự nhiên, không emoji, không ký hiệu, không markdown, không liệt kê dài.
- Có bình luận mới: gọi tên từng khách và trả lời ngắn câu hỏi của họ (gộp các câu giống nhau). Khách muốn mua: hướng dẫn bấm giỏ hàng hoặc nhắn tin cho shop.
- Không có bình luận: giới thiệu sản phẩm được yêu cầu (điểm nổi bật, giá, ưu đãi), rồi kêu gọi thả tim, bình luận, theo dõi.
- Không lặp lại nguyên văn những câu vừa nói. Không nói rằng mình là AI trừ khi bị hỏi thẳng.
- Không hứa điều shop không nêu; câu hỏi ngoài thông tin thì mời khách nhắn tin để shop tư vấn.`
}

// Một lượt nói của MC ảo: trả lời bình luận chưa trả lời, hoặc giới thiệu sản phẩm kế tiếp
export async function luotTiepTheo(p: PhienLive, o: { spTruoc: number; daNoi: string[]; dauTien: boolean }) {
  const soSp = p.san_pham.length
  let loiNoi = ''
  let sanPham = 0
  let traLoiCho: string[] = []

  if (o.dauTien && p.loi_mo_dau.trim()) {
    loiNoi = p.loi_mo_dau.trim()
  } else {
    // Bình luận chưa trả lời trong 3 phút gần nhất (cũ hơn thì bỏ, khách đã đi)
    const tu = new Date(Date.now() - 3 * 60_000).toISOString()
    const { data } = await db()
      .from('live_binh_luan')
      .select('id, ten, noi_dung')
      .eq('phien_id', p.id)
      .eq('da_tra_loi', false)
      .gte('tao_luc', tu)
      .order('id', { ascending: true })
      .limit(6)
    const bl = (data ?? []) as { id: number; ten: string; noi_dung: string }[]
    if (bl.length) await db().from('live_binh_luan').update({ da_tra_loi: true }).in('id', bl.map((x) => x.id))
    traLoiCho = [...new Set(bl.map((x) => x.ten))]

    const spTiep = soSp ? (o.spTruoc % soSp) + 1 : 0
    const yeuCau = bl.length
      ? `BÌNH LUẬN MỚI:\n${bl.map((x) => `- ${x.ten}: ${x.noi_dung}`).join('\n')}\nHãy trả lời các bình luận này.`
      : spTiep
        ? `Không có bình luận mới. Giới thiệu sản phẩm số ${spTiep}.`
        : 'Không có bình luận mới. Chào người xem mới vào, kêu gọi thả tim, bình luận câu hỏi.'
    const truoc = o.daNoi.slice(-3)
    const chu = await goiGeminiJson(
      loiDan(p),
      [{ role: 'user', parts: [{ text: `${truoc.length ? `NHỮNG CÂU VỪA NÓI (đừng lặp lại):\n${truoc.map((x) => `- ${x}`).join('\n')}\n\n` : ''}${yeuCau}` }] }],
      SCHEMA_LUOT,
      0.8,
    )
    const kq = JSON.parse(chu) as { loi_noi?: string; san_pham?: number }
    loiNoi = (kq.loi_noi ?? '').trim()
    sanPham = Number(kq.san_pham) || 0
    if (!bl.length && spTiep && !sanPham) sanPham = spTiep
  }
  if (!loiNoi) throw new Error('AI không có lời nói')
  if (sanPham < 0 || sanPham > soSp) sanPham = 0
  const amThanh = await docThanhGiong(loiNoi.slice(0, 800), p.giong || 'Kore')
  return { loiNoi, sanPham, traLoiCho, amThanh }
}
