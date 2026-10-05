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
  kich_ban?: string // các đoạn đọc sẵn, cách nhau bằng dòng trống
}

// Giọng của máy tính (giọng tiếng Việt có sẵn trong Windows / trình duyệt): miễn phí, không giới hạn
export const GIONG_MAY = 'may'

// Tách kịch bản thành các đoạn (cách nhau bằng dòng trống)
export const doanKichBan = (kb: string | undefined) =>
  (kb ?? '')
    .split(/\n\s*\n/)
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

const tuChu = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !/\d/.test(w))

// Đoạn kịch bản đang nói về sản phẩm nào: so các từ trong tên sản phẩm (bỏ số, vì kịch bản đọc số thành chữ). 0 nếu không rõ.
function timSanPham(p: PhienLive, chu: string) {
  const co = new Set(tuChu(chu))
  let tot = 0
  let diem = 0.6
  p.san_pham.forEach((x, i) => {
    const tu = [...new Set(tuChu(x.ten))]
    if (!tu.length) return
    const d = tu.filter((w) => co.has(w)).length / tu.length
    if (d >= diem) [tot, diem] = [i + 1, d + 1e-9]
  })
  return tot
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

// Một lượt nói của MC ảo: trả lời bình luận (AI), hoặc đọc đoạn kịch bản kế tiếp (không tốn API),
// hoặc AI tự giới thiệu sản phẩm kế tiếp khi chưa có kịch bản
export async function luotTiepTheo(p: PhienLive, o: { spTruoc: number; daNoi: string[]; dauTien: boolean; doanTruoc: number }) {
  const soSp = p.san_pham.length
  const doan = doanKichBan(p.kich_ban)
  let loiNoi = ''
  let sanPham = 0
  let traLoiCho: string[] = []
  let doanSo = o.doanTruoc

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
    if (!bl.length && doan.length) {
      // Không có bình luận: đọc đoạn kịch bản kế tiếp, xoay vòng
      doanSo = (o.doanTruoc % doan.length) + 1
      loiNoi = doan[doanSo - 1]
      sanPham = timSanPham(p, loiNoi)
    } else {
      const yeuCau = bl.length
        ? `BÌNH LUẬN MỚI:\n${bl.map((x) => `- ${x.ten}: ${x.noi_dung}`).join('\n')}\nHãy trả lời các bình luận này.`
        : spTiep
          ? `Không có bình luận mới. Giới thiệu sản phẩm số ${spTiep}.`
          : 'Không có bình luận mới. Chào người xem mới vào, kêu gọi thả tim, bình luận câu hỏi.'
      const truoc = o.daNoi.slice(-3)
      try {
        const chu = await goiGeminiJson(
          loiDan(p),
          [{ role: 'user', parts: [{ text: `${truoc.length ? `NHỮNG CÂU VỪA NÓI (đừng lặp lại):\n${truoc.map((x) => `- ${x}`).join('\n')}\n\n` : ''}${yeuCau}` }] }],
          SCHEMA_LUOT,
          0.8,
        )
        const kq = JSON.parse(chu) as { loi_noi?: string; san_pham?: number }
        loiNoi = (kq.loi_noi ?? '').trim()
        sanPham = Number(kq.san_pham) || 0
      } catch (e) {
        if (!bl.length) throw e
        console.error('Live AI: Gemini lỗi, trả lời bằng câu soạn sẵn:', e)
        loiNoi = `Em cảm ơn ${traLoiCho.slice(0, 3).join(', ')} đã bình luận ạ! Cả nhà cần tư vấn sản phẩm nào cứ nhắn tin cho shop, bên em trả lời ngay nha.`
      }
      if (!bl.length && spTiep && !sanPham) sanPham = spTiep
    }
  }
  if (!loiNoi) throw new Error('AI không có lời nói')
  if (sanPham < 0 || sanPham > soSp) sanPham = 0
  // Giọng Gemini: lỗi (vd. hết lượt miễn phí) thì để trống, sân khấu tự đọc bằng giọng máy tính
  let amThanh = ''
  let canhBao = ''
  if (p.giong && p.giong !== GIONG_MAY) {
    try {
      amThanh = await docThanhGiong(loiNoi.slice(0, 800), p.giong)
    } catch (e) {
      canhBao = e instanceof Error ? e.message : 'Lỗi giọng đọc'
    }
  }
  return { loiNoi, sanPham, traLoiCho, amThanh, doanSo, canhBao }
}

// AI soạn sẵn kịch bản đọc cho cả buổi live (chỉ tốn 1 lượt Gemini). Mỗi đoạn cách nhau một dòng trống.
export async function vietKichBan(p: Pick<PhienLive, 'ten' | 'thong_tin' | 'cach_noi' | 'san_pham'>) {
  const chu = await goiGeminiJson(
    loiDan({ ...p, id: '', ma: '', nguoi_dung_id: '', tiktok: '', loi_mo_dau: '', giong: '' }),
    [
      {
        role: 'user',
        parts: [
          {
            text: 'Viết kịch bản đọc cho buổi livestream: 1 đoạn chào mở đầu, mỗi sản phẩm 2 đoạn (giới thiệu điểm nổi bật + giá, và kêu gọi chốt đơn), xen kẽ vài đoạn kêu gọi thả tim, theo dõi, bình luận. Mỗi đoạn 2–4 câu văn nói, số viết bằng chữ để đọc cho chuẩn.',
          },
        ],
      },
    ],
    { type: 'OBJECT', properties: { doan: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['doan'] },
    0.9,
  )
  const ds = ((JSON.parse(chu) as { doan?: string[] }).doan ?? []).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (!ds.length) throw new Error('AI chưa viết được kịch bản')
  return ds.join('\n\n')
}
