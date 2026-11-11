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

export type NhanVatAi = { ten: string; moTa: string; tinhCach: string; giong: string }
export type BoiCanhAi = { ten: string; moTa: string }
export type CanhAi = { boiCanh: string; nhanVat: string[]; hanhDong: string; loi: string; hinh: string }
export type VideoAi = { dienBien: { tu: number; den: number; viec: string }[]; mayQuay: string; amThanh: string }
type KetQua<T> = ({ ok: true } & T) | { ok: false; thongBao: string }

const S = (o: object) => ({ type: 'STRING', ...o })
const CO_DAU = /[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i
const cat = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)

// Gọi một agent: kiểm tra khóa trang, gọi Gemini ép JSON, bắt lỗi chữ không dấu
async function goiAgent<T>(heThong: string, noiDung: string, schema: object, nhiet: number): Promise<{ ok: true; kq: T } | { ok: false; thongBao: string }> {
  if (!(await daMoKhoa())) return { ok: false, thongBao: CHUA_MO }
  try {
    const chu = await goiGeminiJson(heThong, [{ role: 'user', parts: [{ text: noiDung }] }], schema, nhiet, 55_000)
    if (!CO_DAU.test(chu)) return { ok: false, thongBao: 'AI trả về chữ không dấu, hãy bấm thử lại' }
    return { ok: true, kq: JSON.parse(chu) as T }
  } catch (e) {
    return { ok: false, thongBao: e instanceof Error ? e.message : 'AI lỗi, hãy thử lại' }
  }
}

const CAM_CHUNG = 'Không dùng tên, hình ảnh của người thật, người nổi tiếng, nhân vật của phim hay kênh khác, nhãn hiệu thật. Viết tiếng Việt có dấu đầy đủ.'

// ---------------- Agent 1: nhân vật ----------------
const HE_NV = `Bạn là AGENT THIẾT KẾ NHÂN VẬT cho phim hoạt hình 2D chibi, thể loại hài đời thường Việt Nam.
Từ ý chính câu chuyện, lập danh sách nhân vật cần có (2-5 người). Nhân vật đã có sẵn thì GIỮ NGUYÊN tên và mô tả, chỉ thêm người còn thiếu, bỏ người không xuất hiện trong chuyện.
Với mỗi nhân vật:
- moTa: ngoại hình CỐ ĐỊNH, cụ thể để AI vẽ lại y hệt ở mọi cảnh: giới tính, tuổi, dáng người, khuôn mặt, kiểu tóc và màu tóc, quần áo với màu cụ thể, giày dép, một chi tiết nhận diện riêng. 1-2 câu, không dùng từ mơ hồ như "đẹp", "bình thường".
- tinhCach: tính cách và vai trò trong chuyện, 1 câu.
- giong: giọng nói để AI video lồng tiếng (nam hay nữ, tuổi, nhịp nói, sắc thái), 1 câu ngắn.
Hai nhân vật phải khác nhau rõ ở dáng, tóc và màu quần áo. ${CAM_CHUNG}`

export async function agentNhanVat(yChinh: string, phongCach: string, daCo: NhanVatAi[]): Promise<KetQua<{ nhanVat: NhanVatAi[] }>> {
  const y = cat(yChinh, 3000)
  if (y.length < 20) return { ok: false, thongBao: 'Hãy kể ý chính câu chuyện dài hơn một chút (ít nhất vài câu)' }
  const r = await goiAgent<{ nhan_vat?: { ten?: string; mo_ta?: string; tinh_cach?: string; giong?: string }[] }>(
    HE_NV,
    `Phong cách vẽ: ${cat(phongCach, 600)}\n\nNhân vật đã có:\n${daCo.filter((n) => n.ten.trim()).map((n) => `- ${n.ten}: ${n.moTa}`).join('\n') || '(chưa có)'}\n\nÝ chính câu chuyện:\n${y}`,
    {
      type: 'OBJECT',
      properties: {
        nhan_vat: {
          type: 'ARRAY',
          items: { type: 'OBJECT', properties: { ten: S({}), mo_ta: S({}), tinh_cach: S({}), giong: S({}) }, required: ['ten', 'mo_ta', 'tinh_cach', 'giong'] },
        },
      },
      required: ['nhan_vat'],
    },
    0.7,
  )
  if (!r.ok) return r
  const nhanVat = (r.kq.nhan_vat ?? [])
    .map((n) => ({ ten: cat(n.ten, 40), moTa: cat(n.mo_ta, 400), tinhCach: cat(n.tinh_cach, 200), giong: cat(n.giong, 150) }))
    .filter((n) => n.ten && n.moTa)
    .slice(0, 8)
  if (!nhanVat.length) return { ok: false, thongBao: 'Agent chưa tạo được nhân vật nào, hãy thử lại' }
  return { ok: true, nhanVat }
}

// ---------------- Agent 2: kịch bản ----------------
const HE_KB = (giay: number, soTu: number) => `Bạn là AGENT BIÊN KỊCH phim hoạt hình 2D chibi, thể loại HÀI ĐỜI THƯỜNG Việt Nam (không đổi sang thể loại khác).
Mỗi cảnh là MỘT đoạn video liền mạch dài ${giay} giây do AI tạo video dựng, không cắt cảnh bên trong.
Quy tắc:
- Cấu trúc cả mẩu: câu mở gây tò mò → tình huống → sự cố → leo thang → cú lật bất ngờ → câu chốt. Chi tiết cài ở đầu phải được trả lại ở cuối.
- bo_canh: tên ngắn của nơi diễn ra (ví dụ "Phòng khách nhà Tí"). Quay lại nơi cũ thì dùng ĐÚNG tên cũ. Cả mẩu chỉ nên có 2-4 bối cảnh.
- nhan_vat: tên các nhân vật có mặt, đúng tên trong danh sách, tối đa 3 người một cảnh.
- hanh_dong: chuyện xảy ra trong ${giay} giây, chỉ 1-2 hành động cụ thể nhìn thấy được.
- loi: lời thoại trong cảnh, mỗi câu một dòng dạng "Tên: câu nói". Tổng tối đa ${soTu} từ để nói kịp trong ${giay} giây. Để trống nếu cảnh chỉ có hành động.
- hinh: khung hình ĐẦU TIÊN của cảnh để vẽ ảnh tĩnh: ai đứng đâu (trái, giữa, phải), tư thế, biểu cảm, cỡ cảnh. Gọi nhân vật bằng tên, không tả lại ngoại hình hay quần áo.
- Câu thoại ngắn, tự nhiên, đúng tính cách; cứ 2 cảnh có một chỗ gây cười. Biểu cảm phóng đại kiểu hoạt hình.
- Không có chữ trong hình. ${CAM_CHUNG}`

export async function agentKichBan(yChinh: string, soCanh: number, giay: number, nhanVat: NhanVatAi[]): Promise<KetQua<{ ten: string; canh: CanhAi[] }>> {
  const y = cat(yChinh, 3000)
  if (y.length < 20) return { ok: false, thongBao: 'Hãy kể ý chính câu chuyện dài hơn một chút (ít nhất vài câu)' }
  const g = giay === 10 ? 10 : 8
  const so = Math.min(14, Math.max(3, Math.round(soCanh) || 8))
  const ds = nhanVat.filter((n) => n.ten.trim()).map((n) => `- ${n.ten}: ${n.tinhCach || n.moTa}`).join('\n')
  const r = await goiAgent<{ ten?: string; canh?: { bo_canh?: string; nhan_vat?: string[]; hanh_dong?: string; loi?: string; hinh?: string }[] }>(
    HE_KB(g, g === 10 ? 24 : 18),
    `Nhân vật:\n${ds || '(chưa có, hãy tự đặt 2-3 nhân vật)'}\n\nÝ chính câu chuyện:\n${y}\n\nViết đúng ${so} cảnh.`,
    {
      type: 'OBJECT',
      properties: {
        ten: S({ description: 'Tên mẩu chuyện, ngắn, gây tò mò' }),
        canh: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { bo_canh: S({}), nhan_vat: { type: 'ARRAY', items: S({}) }, hanh_dong: S({}), loi: S({}), hinh: S({}) },
            required: ['bo_canh', 'nhan_vat', 'hanh_dong', 'loi', 'hinh'],
          },
        },
      },
      required: ['ten', 'canh'],
    },
    0.9,
  )
  if (!r.ok) return r
  const canh = (r.kq.canh ?? [])
    .map((c) => ({
      boiCanh: cat(c.bo_canh, 80),
      nhanVat: (c.nhan_vat ?? []).map((x) => cat(x, 40)).filter(Boolean).slice(0, 4),
      hanhDong: cat(c.hanh_dong, 500),
      loi: cat(c.loi, 500),
      hinh: cat(c.hinh, 600),
    }))
    .filter((c) => c.hanhDong || c.loi)
    .slice(0, 20)
  if (!canh.length) return { ok: false, thongBao: 'Agent chưa viết được cảnh nào, hãy thử lại' }
  return { ok: true, ten: cat(r.kq.ten, 100), canh }
}

// ---------------- Agent đạo diễn & khán giả YouTube: chấm và sửa kịch bản ----------------
export type DanhGia = {
  tongThe: string
  diemManh: string[]
  diemYeu: string[]
  moDau: string
  giuChan: string
  daoDien: string
  catBo: string[]
  suaTungCanh: { so: number; vanDe: string; cachSua: string }[]
  tieuDe: string[]
  thumbnail: string[]
  cauMoDau: string
  tiemNang: string
  keHoach: string[]
  videoTiep: string[]
}

const HE_DD = (giay: number, soTu: number) => `Bạn đồng thời đóng HAI vai:
1) ĐẠO DIỄN PHIM CHUYÊN NGHIỆP: xây câu chuyện hấp dẫn, thiết kế bố cục, góc máy, chuyển động máy, diễn xuất, nhịp độ, âm thanh; tạo cao trào, bất ngờ, xung đột; hình phải khớp lời; cắt cảnh thừa và hành động vô nghĩa.
2) KHÁN GIẢ YOUTUBE KHÓ TÍNH, có quyền rời đi bất cứ lúc nào: tôi có lý do gì để bấm vào? 5-15 giây đầu có giữ tôi lại không? Có đoạn nào nhàm chán khiến tôi thoát không? Hình có cuốn hút trên điện thoại không? Có điều gì khiến tôi muốn chia sẻ không?

Mục tiêu: tăng tỉ lệ bấm xem, giữ chân từ giây đầu, tăng thời lượng xem, tạo cảm xúc để xem đến cuối và muốn xem video tiếp theo. Hình đẹp không đồng nghĩa với sức hút.

Nhiệm vụ: đánh giá kịch bản được gửi theo đủ các mục, rồi VIẾT LẠI kịch bản đã sửa (canh_moi).
Nguyên tắc: không khen xã giao, không nói chung chung; mỗi lỗi phải chỉ rõ cảnh nào và cách sửa cụ thể, giải thích vì sao người xem sẽ thấy hay hơn. Phân biệt dữ kiện với nhận định và giả thuyết. Không giật tít sai sự thật, không kéo dài cho đủ thời lượng, không hứa chắc viral hay được đề xuất.

Ràng buộc khi viết lại canh_moi (thể loại hài đời thường 2D chibi, giữ nguyên thể loại):
- Mỗi cảnh là một đoạn video ${giay} giây liền mạch. Câu mở đầu phải gây tò mò ngay trong 5 giây đầu; xung đột đưa vào sớm; mỗi cảnh phải đẩy chuyện đi tiếp hoặc gây cười; có cú lật và câu chốt.
- Chỉ dùng nhân vật trong danh sách; bo_canh dùng lại tên cũ, tổng 2-4 bối cảnh; thay đổi cỡ cảnh (toàn, trung, cận, đặc tả) giữa các cảnh.
- loi: mỗi câu một dòng "Tên: câu nói", tổng tối đa ${soTu} từ một cảnh. hanh_dong: 1-2 hành động nhìn thấy được. hinh: khung hình đầu, gọi nhân vật bằng tên, không tả lại ngoại hình.
- Số cảnh có thể bớt nếu cắt cảnh thừa, không thêm quá 2 cảnh.
Không dùng người thật, nhãn hiệu thật. Viết tiếng Việt có dấu đầy đủ.`

export async function agentDaoDien(
  giay: number,
  ten: string,
  canh: { boiCanh: string; nhanVat: string[]; hanhDong: string; loi: string; hinh: string }[],
  nhanVat: NhanVatAi[],
): Promise<KetQua<{ danhGia: DanhGia; canh: CanhAi[] }>> {
  const g = giay === 10 ? 10 : 8
  if (!canh.some((c) => c.loi.trim() || c.hanhDong.trim())) return { ok: false, thongBao: 'Chưa có kịch bản, hãy chạy agent kịch bản trước' }
  const ds = canh
    .slice(0, 20)
    .map((c, i) => `Cảnh ${i + 1} | bối cảnh: ${cat(c.boiCanh, 80) || '?'} | nhân vật: ${c.nhanVat.join(', ') || '?'}\n  Hành động: ${cat(c.hanhDong, 400)}\n  Lời thoại: ${cat(c.loi, 400) || '(không có)'}\n  Khung đầu: ${cat(c.hinh, 400)}`)
    .join('\n')
  const mang = { type: 'ARRAY', items: S({}) }
  const r = await goiAgent<{
    tong_the?: string
    diem_manh?: string[]
    diem_yeu?: string[]
    mo_dau_30_giay?: string
    giu_chan?: string
    dao_dien?: string
    cat_bo?: string[]
    sua_tung_canh?: { so?: number; van_de?: string; cach_sua?: string }[]
    tieu_de?: string[]
    thumbnail?: string[]
    cau_mo_dau?: string
    tiem_nang?: string
    ke_hoach?: string[]
    video_tiep?: string[]
    canh_moi?: { bo_canh?: string; nhan_vat?: string[]; hanh_dong?: string; loi?: string; hinh?: string }[]
  }>(
    HE_DD(g, g === 10 ? 24 : 18),
    `Tên mẩu: ${cat(ten, 100) || '(chưa đặt)'}\n\nNhân vật:\n${nhanVat.filter((n) => n.ten.trim()).map((n) => `- ${n.ten}: ${n.tinhCach || n.moTa}`).join('\n')}\n\nKịch bản hiện tại:\n${ds}`,
    {
      type: 'OBJECT',
      properties: {
        tong_the: S({ description: '1. Đánh giá tổng thể, 2-3 câu' }),
        diem_manh: { ...mang, description: '2. Điểm mạnh' },
        diem_yeu: { ...mang, description: '2. Điểm yếu' },
        mo_dau_30_giay: S({ description: '3. Phân tích sức hút 30 giây đầu' }),
        giu_chan: S({ description: '4. Khả năng giữ chân, chỉ rõ cảnh có nguy cơ khiến người xem rời đi' }),
        dao_dien: S({ description: '5. Hình ảnh, góc máy, diễn xuất, âm thanh' }),
        cat_bo: { ...mang, description: '6. Phân đoạn cần cắt hoặc làm lại, ghi số cảnh' },
        sua_tung_canh: {
          type: 'ARRAY',
          description: '7. Sửa cụ thể theo từng cảnh của kịch bản CŨ',
          items: { type: 'OBJECT', properties: { so: { type: 'INTEGER' }, van_de: S({}), cach_sua: S({}) }, required: ['so', 'van_de', 'cach_sua'] },
        },
        tieu_de: { ...mang, description: '8. Đúng 3 tiêu đề YouTube gây tò mò nhưng không sai sự thật' },
        thumbnail: { ...mang, description: '8. 2-3 ý tưởng ảnh thu nhỏ' },
        cau_mo_dau: S({ description: 'Câu mở đầu mạnh nhất' }),
        tiem_nang: S({ description: '9. Tiềm năng tiếp cận khán giả, ghi rõ đây là nhận định' }),
        ke_hoach: { ...mang, description: '10. Kế hoạch nâng cấp trước khi xuất bản, gồm cả lời kêu gọi hành động tự nhiên' },
        video_tiep: { ...mang, description: 'Ý tưởng video tiếp theo cho chuỗi nội dung' },
        canh_moi: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { bo_canh: S({}), nhan_vat: mang, hanh_dong: S({}), loi: S({}), hinh: S({}) },
            required: ['bo_canh', 'nhan_vat', 'hanh_dong', 'loi', 'hinh'],
          },
        },
      },
      required: ['tong_the', 'diem_manh', 'diem_yeu', 'mo_dau_30_giay', 'giu_chan', 'dao_dien', 'cat_bo', 'sua_tung_canh', 'tieu_de', 'thumbnail', 'cau_mo_dau', 'tiem_nang', 'ke_hoach', 'video_tiep', 'canh_moi'],
    },
    0.7,
  )
  if (!r.ok) return r
  const k = r.kq
  const ds2 = (x?: string[], n = 8) => (x ?? []).map((s) => cat(s, 400)).filter(Boolean).slice(0, n)
  const canhMoi = (k.canh_moi ?? [])
    .map((c) => ({
      boiCanh: cat(c.bo_canh, 80),
      nhanVat: (c.nhan_vat ?? []).map((x) => cat(x, 40)).filter(Boolean).slice(0, 4),
      hanhDong: cat(c.hanh_dong, 500),
      loi: cat(c.loi, 500),
      hinh: cat(c.hinh, 600),
    }))
    .filter((c) => c.hanhDong || c.loi)
    .slice(0, 22)
  return {
    ok: true,
    danhGia: {
      tongThe: cat(k.tong_the, 800),
      diemManh: ds2(k.diem_manh),
      diemYeu: ds2(k.diem_yeu),
      moDau: cat(k.mo_dau_30_giay, 800),
      giuChan: cat(k.giu_chan, 800),
      daoDien: cat(k.dao_dien, 800),
      catBo: ds2(k.cat_bo),
      suaTungCanh: (k.sua_tung_canh ?? [])
        .map((x) => ({ so: Math.round(Number(x.so)) || 0, vanDe: cat(x.van_de, 300), cachSua: cat(x.cach_sua, 400) }))
        .filter((x) => x.vanDe || x.cachSua)
        .slice(0, 20),
      tieuDe: ds2(k.tieu_de, 3),
      thumbnail: ds2(k.thumbnail, 3),
      cauMoDau: cat(k.cau_mo_dau, 300),
      tiemNang: cat(k.tiem_nang, 600),
      keHoach: ds2(k.ke_hoach),
      videoTiep: ds2(k.video_tiep, 5),
    },
    canh: canhMoi,
  }
}

// ---------------- Agent 3: bối cảnh ----------------
const HE_BC = `Bạn là AGENT THIẾT KẾ BỐI CẢNH cho phim hoạt hình 2D chibi đời thường Việt Nam.
Với MỖI bối cảnh trong danh sách (giữ đúng tên), viết mo_ta CỐ ĐỊNH, cụ thể để AI vẽ lại y hệt ở mọi cảnh: loại nơi chốn, ban ngày hay ban đêm, bố cục trái - giữa - phải, 3-5 đồ vật chính với màu cụ thể, màu tường / sàn / trời, ánh sáng. 2-3 câu.
Bối cảnh vẽ TRỐNG, không có người. Bối cảnh đã có mô tả thì giữ nguyên. Đồ vật cần cho kịch bản (theo các hành động được liệt kê) phải có mặt. ${CAM_CHUNG}`

export async function agentBoiCanh(phongCach: string, ten: string[], daCo: BoiCanhAi[], hanhDong: string[]): Promise<KetQua<{ boiCanh: BoiCanhAi[] }>> {
  const ds = [...new Set(ten.map((t) => t.trim()).filter(Boolean))].slice(0, 8)
  if (!ds.length) return { ok: false, thongBao: 'Kịch bản chưa có bối cảnh nào, hãy chạy agent kịch bản trước' }
  const cu = new Map(daCo.map((b) => [b.ten.trim(), b.moTa]))
  const r = await goiAgent<{ boi_canh?: { ten?: string; mo_ta?: string }[] }>(
    HE_BC,
    `Phong cách vẽ: ${cat(phongCach, 600)}\n\nCác bối cảnh cần thiết kế:\n${ds.map((t) => `- ${t}${cu.get(t) ? `: (đã có) ${cu.get(t)}` : ''}`).join('\n')}\n\nCác hành động diễn ra trong phim:\n${hanhDong.map((h) => `- ${cat(h, 200)}`).join('\n')}`,
    {
      type: 'OBJECT',
      properties: { boi_canh: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ten: S({}), mo_ta: S({}) }, required: ['ten', 'mo_ta'] } } },
      required: ['boi_canh'],
    },
    0.6,
  )
  if (!r.ok) return r
  const moi = new Map((r.kq.boi_canh ?? []).map((b) => [cat(b.ten, 80), cat(b.mo_ta, 600)]))
  // Giữ đúng thứ tự và tên trong kịch bản; mô tả cũ của người dùng được ưu tiên
  const boiCanh = ds.map((t) => ({ ten: t, moTa: cu.get(t) || moi.get(t) || [...moi.entries()].find(([k]) => k.toLowerCase() === t.toLowerCase())?.[1] || '' }))
  return { ok: true, boiCanh }
}

// ---------------- Agent 4: câu lệnh video ----------------
const HE_VD = (giay: number) => `Bạn là AGENT ĐẠO DIỄN VIDEO. Với từng cảnh, viết diễn biến để AI tạo video (như Veo trong Gemini) dựng một đoạn ${giay} giây liền mạch, bắt đầu từ ảnh khung đầu của cảnh.
Với mỗi cảnh (giữ đúng số "so"):
- dien_bien: 3-4 mốc thời gian liền nhau phủ kín từ 0 đến ${giay} giây. Mỗi mốc tả chính xác cử động nhìn thấy: ai, bộ phận nào, làm gì, biểu cảm ra sao. Khớp lời thoại: ai đang nói thì miệng người đó cử động, người kia phản ứng.
- may_quay: một câu về cỡ cảnh và chuyển động máy (đứng yên, đẩy chậm vào, lia nhẹ...). Không cắt cảnh, không đổi góc đột ngột.
- am_thanh: tiếng nền và tiếng động cụ thể của cảnh. Không nhạc có lời.
Chỉ dùng những gì có trong cảnh: không thêm nhân vật, đồ vật hay nơi chốn mới, không đổi quần áo. Hành động nhỏ, vừa sức ${giay} giây. Tiếng Việt có dấu.`

export async function agentVideo(
  giay: number,
  canh: { boiCanh: string; nhanVat: string[]; hanhDong: string; loi: string; hinh: string }[],
): Promise<KetQua<{ video: (VideoAi | null)[] }>> {
  const g = giay === 10 ? 10 : 8
  if (!canh.length) return { ok: false, thongBao: 'Chưa có cảnh nào, hãy chạy agent kịch bản trước' }
  const ds = canh
    .slice(0, 20)
    .map((c, i) => `Cảnh so=${i + 1}\n- Bối cảnh: ${cat(c.boiCanh, 80)}\n- Nhân vật: ${c.nhanVat.join(', ') || '(không rõ)'}\n- Khung đầu: ${cat(c.hinh, 400)}\n- Hành động: ${cat(c.hanhDong, 400)}\n- Lời thoại: ${cat(c.loi, 400) || '(không có)'}`)
    .join('\n\n')
  const r = await goiAgent<{ canh?: { so?: number; dien_bien?: { tu?: number; den?: number; viec?: string }[]; may_quay?: string; am_thanh?: string }[] }>(
    HE_VD(g),
    ds,
    {
      type: 'OBJECT',
      properties: {
        canh: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              so: { type: 'INTEGER' },
              dien_bien: {
                type: 'ARRAY',
                items: { type: 'OBJECT', properties: { tu: { type: 'NUMBER' }, den: { type: 'NUMBER' }, viec: S({}) }, required: ['tu', 'den', 'viec'] },
              },
              may_quay: S({}),
              am_thanh: S({}),
            },
            required: ['so', 'dien_bien', 'may_quay', 'am_thanh'],
          },
        },
      },
      required: ['canh'],
    },
    0.6,
  )
  if (!r.ok) return r
  const video: (VideoAi | null)[] = canh.map(() => null)
  for (const c of r.kq.canh ?? []) {
    const i = Math.round(Number(c.so)) - 1
    if (i < 0 || i >= video.length) continue
    const dienBien = (c.dien_bien ?? [])
      .map((d) => ({ tu: Math.max(0, Math.min(g, Number(d.tu) || 0)), den: Math.max(0, Math.min(g, Number(d.den) || 0)), viec: cat(d.viec, 300) }))
      .filter((d) => d.viec)
      .slice(0, 6)
    if (dienBien.length) video[i] = { dienBien, mayQuay: cat(c.may_quay, 200), amThanh: cat(c.am_thanh, 200) }
  }
  if (!video.some(Boolean)) return { ok: false, thongBao: 'Agent chưa viết được câu lệnh video nào, hãy thử lại' }
  return { ok: true, video }
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
