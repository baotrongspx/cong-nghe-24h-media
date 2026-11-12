'use server'

import { revalidatePath } from 'next/cache'
import { goiGeminiJson } from '@/lib/gemini'
import { GIONG, docThanhGiong } from '@/lib/giongNoi'
import { daMoKhoa, moKhoa } from '@/lib/khoa'
import { ANH_SANG_2D, CAM_XUC_2D, CHUYEN_CANH_2D, DANG_NGUOI_2D, PHU_KIEN_2D, DAO_CU_2D, DS_KHU_2D, HANH_DONG_2D, HIEU_UNG_2D, KHU_VUC_2D, MAY_QUAY_2D, THOI_TIET_2D } from './danhMuc2d'

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
export type CanhAi = { boiCanh: string; nhanVat: string[]; viTri: string; hanhDong: string; loi: string; hinh: string }
export type VideoAi = { dienBien: { tu: number; den: number; viec: string }[]; mayQuay: string; amThanh: string }
type KetQua<T> = ({ ok: true } & T) | { ok: false; thongBao: string }

const S = (o: object) => ({ type: 'STRING', ...o })
const CO_DAU = /[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i
const cat = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n)

// Gọi một agent: kiểm tra khóa trang, gọi Gemini ép JSON, bắt lỗi chữ không dấu
async function goiAgent<T>(heThong: string, noiDung: string, schema: object, nhiet: number, moHinh: string[] = []): Promise<{ ok: true; kq: T } | { ok: false; thongBao: string }> {
  if (!(await daMoKhoa())) return { ok: false, thongBao: CHUA_MO }
  try {
    const chu = await goiGeminiJson(heThong, [{ role: 'user', parts: [{ text: noiDung }] }], schema, nhiet, 55_000, moHinh)
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
- moTa: ngoại hình CỐ ĐỊNH, cụ thể để AI vẽ lại y hệt ở mọi cảnh: giới tính, tuổi, dáng người, khuôn mặt, có đeo kính không (kiểu kính), kiểu tóc và màu tóc, dây buộc tóc nếu có, quần áo (kiểu áo, cổ áo, tay dài hay ngắn) với màu có sắc độ rõ (ví dụ "xanh bạc hà nhạt", "cam đậm", không chỉ "xanh"), quần, giày dép, một chi tiết nhận diện riêng. 1-2 câu, không dùng từ mơ hồ như "đẹp", "bình thường".
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
const HE_KB = (giay: number, soTu: number) => `Bạn là AGENT BIÊN KỊCH phim hoạt hình 2D, thể loại HÀI ĐỜI THƯỜNG Việt Nam (không đổi sang thể loại khác).
Mỗi cảnh là một nhịp truyện ở MỘT nơi, MỘT thời điểm (đổi nơi hoặc nhảy thời gian thì sang cảnh mới); cảnh dài ngắn tùy nội dung cần, nhân vật vừa nói vừa làm việc cụ thể (cầm, đưa, ngồi, đi, mở cửa, gọi điện...). Diễn bằng hành động, không chỉ đứng nói.
Quy tắc:
- Cấu trúc cả mẩu: câu mở gây tò mò → tình huống → sự cố → leo thang → cú lật bất ngờ → câu chốt. Chi tiết cài ở đầu phải được trả lại ở cuối.
- Nếu có TƯ LIỆU (chuyển thể từ bách khoa toàn thư): KỂ BẰNG THOẠI giữa các nhân vật — nhân vật chính nói nhiều nhất, nhân vật phụ và các nhân vật khác cùng tham gia đối đáp; mỗi cảnh có ít nhất 2 người nói; người dẫn (Người kể) chỉ nói câu ngắn để nối thời gian, địa điểm. Sự kiện, năm tháng, con số, tên riêng phải đúng tư liệu; được thêm lời thoại, cảm xúc và chi tiết đời thường hợp lý.
- Nếu được giao viết MỘT HỒI của phim dài: chỉ viết đúng phần việc của hồi đó theo dàn ý, nối tiếp liền mạch phần trước (giữ tên nơi chốn, đồ vật, tâm trạng), không kết thúc cả phim trừ khi là hồi cuối.
- Nếu được giao viết MỘT HỒI của phim dài: chỉ viết đúng phần việc của hồi đó theo dàn ý, nối tiếp liền mạch phần trước (giữ tên nơi chốn, đồ vật, tâm trạng), không kết thúc cả phim trừ khi là hồi cuối.
- bo_canh: tên ngắn của nơi diễn ra (ví dụ "Phòng khách nhà Tí"). Quay lại nơi cũ thì dùng ĐÚNG tên cũ. Cả mẩu chỉ nên có 2-4 bối cảnh.
- nhan_vat: tên các nhân vật có mặt, đúng tên trong danh sách, tối đa 3 người một cảnh.
- vi_tri: ai đứng bên trái, ở giữa, bên phải màn hình và quay mặt về hướng nào. Hai nhân vật đã đứng trái/phải ở một bối cảnh thì GIỮ NGUYÊN bên đó trong mọi cảnh tiếp theo ở bối cảnh ấy (không đổi chỗ, không vượt trục), trừ khi hành động bắt buộc có người đi sang.
- hanh_dong: những việc nhân vật làm trong cảnh, cụ thể, nhìn thấy được.
- loi: lời thoại trong cảnh, mỗi câu một dòng dạng "Tên: câu nói". Cảnh dài ngắn tùy nội dung (đọc khoảng 3 chữ mỗi giây), tối đa khoảng ${soTu} từ một cảnh. Để trống nếu cảnh chỉ có hành động.
- hinh: khung hình ĐẦU TIÊN của cảnh để vẽ ảnh tĩnh: ai đứng đâu (trái, giữa, phải), tư thế, biểu cảm, cỡ cảnh. Gọi nhân vật bằng tên, không tả lại ngoại hình hay quần áo.
- Câu thoại ngắn, tự nhiên, đúng tính cách; cứ 2 cảnh có một chỗ gây cười. Biểu cảm phóng đại kiểu hoạt hình.
- Không có chữ trong hình. ${CAM_CHUNG}`

// ---------------- Agent: DÀN Ý phim dài (chia hồi) ----------------
const HE_DY = `Bạn là BIÊN KỊCH TRƯỞNG phim hoạt hình 2D hài đời thường Việt Nam. Từ ý chính, lập DÀN Ý cho phim có độ dài cho trước, chia thành các HỒI liên tiếp (mỗi hồi khoảng 1,5 phút).
Cả phim có mạch: mở đầu gây tò mò → tình huống → các rắc rối leo thang (mỗi hồi một rắc rối mới hoặc nặng hơn) → cao trào → cú lật bất ngờ → kết có hậu hoặc câu chốt hài.
Nếu có TƯ LIỆU (cốt truyện thật từ bách khoa toàn thư): các hồi đi đúng các sự kiện thật theo thứ tự thời gian, không bịa sự kiện, năm tháng, con số; chỉ được thêm tình huống đời thường và xung đột nhỏ để kịch tính hóa, và nêu rõ nhân vật nào tham gia mỗi hồi.
Mỗi hồi: tieu_de ngắn, noi_dung 3-5 câu nói rõ chuyện gì xảy ra, ở đâu, ai làm gì, đồ vật quan trọng, và kết hồi bằng một móc câu khiến người xem muốn xem tiếp. Chi tiết cài ở hồi đầu phải được trả lại ở cuối. ${CAM_CHUNG}`

export async function agentDanY(yChinh: string, phut: number, nhanVat: NhanVatAi[], tuLieu = ''): Promise<KetQua<{ ten: string; hoi: { tieuDe: string; noiDung: string; giay: number }[] }>> {
  const y = cat(yChinh, 3000)
  if (y.length < 20) return { ok: false, thongBao: 'Hãy kể ý chính câu chuyện dài hơn một chút (ít nhất vài câu)' }
  const tong = Math.round(phut * 60)
  const r = await goiAgent<{ ten?: string; hoi?: { tieu_de?: string; noi_dung?: string; thoi_luong_giay?: number }[] }>(
    HE_DY,
    `Độ dài phim: ${phut} phút (${tong} giây). TỰ CHIA số hồi theo mạch truyện (thường 2-12 hồi, mỗi hồi một chặng sự việc trọn vẹn), và phân thời lượng cho từng hồi theo độ quan trọng: hồi cao trào dài hơn, hồi chuyển tiếp ngắn. Tổng thời lượng các hồi = ${tong} giây.\nNhân vật:\n${nhanVat.filter((n) => n.ten.trim()).map((n) => `- ${n.ten}: ${n.tinhCach || n.moTa}`).join('\n') || '(tự đặt 2-4 nhân vật)'}\n\nÝ chính:\n${y}${tuLieu ? `\n\nTƯ LIỆU:\n${cat(tuLieu, 12000)}` : ''}`,
    { type: 'OBJECT', properties: { ten: S({}), hoi: { type: 'ARRAY', items: { type: 'OBJECT', properties: { tieu_de: S({}), noi_dung: S({}), thoi_luong_giay: { type: 'INTEGER' } }, required: ['tieu_de', 'noi_dung', 'thoi_luong_giay'] } } }, required: ['ten', 'hoi'] },
    0.9,
  )
  if (!r.ok) return r
  const tho = (r.kq.hoi ?? []).map((h) => ({ tieuDe: cat(h.tieu_de, 100), noiDung: cat(h.noi_dung, 900), giay: Math.max(20, Number(h.thoi_luong_giay) || 0) })).filter((h) => h.noiDung).slice(0, 14)
  const cong = tho.reduce((s, h) => s + h.giay, 0) || 1
  const hoi = tho.map((h) => ({ ...h, giay: Math.round((h.giay * tong) / cong) }))  // chuẩn lại cho đúng tổng độ dài
  if (!hoi.length) return { ok: false, thongBao: 'AI chưa lập được dàn ý, hãy thử lại' }
  return { ok: true, ten: cat(r.kq.ten, 100), hoi }
}

export async function agentKichBan(yChinh: string, soCanh: number, giay: number, nhanVat: NhanVatAi[], nguCanh = ''): Promise<KetQua<{ ten: string; canh: CanhAi[] }>> {
  const y = cat(yChinh, 3000)
  if (y.length < 20) return { ok: false, thongBao: 'Hãy kể ý chính câu chuyện dài hơn một chút (ít nhất vài câu)' }
  const g = Math.min(20, Math.max(8, Math.round(giay) || 15))
  const giayMuc = Math.max(20, Math.round(soCanh * g))
  const ds = nhanVat.filter((n) => n.ten.trim()).map((n) => `- ${n.ten}: ${n.tinhCach || n.moTa}`).join('\n')
  const r = await goiAgent<{ ten?: string; canh?: { bo_canh?: string; nhan_vat?: string[]; vi_tri?: string; hanh_dong?: string; loi?: string; hinh?: string }[] }>(
    HE_KB(g, 140),
    `Nhân vật:\n${ds || '(chưa có, hãy tự đặt 2-3 nhân vật)'}\n\nÝ chính câu chuyện:\n${y}\n\n${cat(nguCanh, 9000)}\n\nThời lượng cần viết: khoảng ${giayMuc} giây (khoảng ${Math.round(giayMuc * 2.6)} chữ thoại). TỰ QUYẾT số cảnh cho hợp nội dung, không chia đều máy móc.`,
    {
      type: 'OBJECT',
      properties: {
        ten: S({ description: 'Tên mẩu chuyện, ngắn, gây tò mò' }),
        canh: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { bo_canh: S({}), nhan_vat: { type: 'ARRAY', items: S({}) }, vi_tri: S({}), hanh_dong: S({}), loi: S({}), hinh: S({}) },
            required: ['bo_canh', 'nhan_vat', 'vi_tri', 'hanh_dong', 'loi', 'hinh'],
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
      viTri: cat(c.vi_tri, 200),
      hanhDong: cat(c.hanh_dong, 500),
      loi: cat(c.loi, 900),
      hinh: cat(c.hinh, 600),
    }))
    .filter((c) => c.hanhDong || c.loi)
    .slice(0, 30)
  if (!canh.length) return { ok: false, thongBao: 'Agent chưa viết được cảnh nào, hãy thử lại' }
  return { ok: true, ten: cat(r.kq.ten, 100), canh }
}

// ---------------- Agent đạo diễn & khán giả YouTube: chấm và sửa kịch bản ----------------
export type DanhGia = {
  tongThe: string
  diemManh: string[]
  diemYeu: { yeu: string; manh: string; canh: string }[]
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

Nhiệm vụ: đánh giá kịch bản được gửi theo đủ các mục. Với MỖI điểm yếu, đừng chỉ chê: chỉ ra cách BIẾN CHÍNH ĐIỂM YẾU ĐÓ THÀNH ĐIỂM MẠNH (ví dụ cảnh chậm thành khoảng lặng gây hồi hộp, chi tiết thừa thành chi tiết cài để trả lại ở cú lật, nhân vật nhạt thành tật xấu đáng yêu gây cười). Sau đó VIẾT LẠI kịch bản đã sửa (canh_moi) áp dụng ĐỦ mọi cách biến điểm yếu thành điểm mạnh đó.
Nguyên tắc: không khen xã giao, không nói chung chung; mỗi lỗi phải chỉ rõ cảnh nào và cách sửa cụ thể, giải thích vì sao người xem sẽ thấy hay hơn. Phân biệt dữ kiện với nhận định và giả thuyết. Không giật tít sai sự thật, không kéo dài cho đủ thời lượng, không hứa chắc viral hay được đề xuất.

Ràng buộc khi viết lại canh_moi (thể loại hài đời thường 2D chibi, giữ nguyên thể loại):
- Mỗi cảnh là một đoạn video ${giay} giây liền mạch. Câu mở đầu phải gây tò mò ngay trong 5 giây đầu; xung đột đưa vào sớm; mỗi cảnh phải đẩy chuyện đi tiếp hoặc gây cười; có cú lật và câu chốt.
- Chỉ dùng nhân vật trong danh sách; bo_canh dùng lại tên cũ, tổng 2-4 bối cảnh; thay đổi cỡ cảnh (toàn, trung, cận, đặc tả) giữa các cảnh.
- vi_tri: ai đứng bên trái, ở giữa, bên phải màn hình và quay mặt về hướng nào. Hai nhân vật đã đứng trái/phải ở một bối cảnh thì GIỮ NGUYÊN bên đó trong mọi cảnh tiếp theo ở bối cảnh ấy (không đổi chỗ, không vượt trục), trừ khi hành động bắt buộc có người đi sang.
- Cảnh sau ở cùng bối cảnh phải bắt đầu đúng từ tư thế và vị trí cuối của cảnh trước (nối tiếp liền mạch).
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
    diem_yeu?: { diem_yeu?: string; bien_thanh_diem_manh?: string; canh?: string }[]
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
    canh_moi?: { bo_canh?: string; nhan_vat?: string[]; vi_tri?: string; hanh_dong?: string; loi?: string; hinh?: string }[]
  }>(
    HE_DD(g, g === 10 ? 24 : 18),
    `Tên mẩu: ${cat(ten, 100) || '(chưa đặt)'}\n\nNhân vật:\n${nhanVat.filter((n) => n.ten.trim()).map((n) => `- ${n.ten}: ${n.tinhCach || n.moTa}`).join('\n')}\n\nKịch bản hiện tại:\n${ds}`,
    {
      type: 'OBJECT',
      properties: {
        tong_the: S({ description: '1. Đánh giá tổng thể, 2-3 câu' }),
        diem_manh: { ...mang, description: '2. Điểm mạnh' },
        diem_yeu: {
          type: 'ARRAY',
          description: '2. Điểm yếu, kèm cách biến chính điểm yếu đó thành điểm mạnh',
          items: {
            type: 'OBJECT',
            properties: { diem_yeu: S({}), bien_thanh_diem_manh: S({ description: 'Cách biến điểm yếu này thành điểm mạnh, cụ thể' }), canh: S({ description: 'Áp dụng ở cảnh nào của kịch bản mới' }) },
            required: ['diem_yeu', 'bien_thanh_diem_manh', 'canh'],
          },
        },
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
            properties: { bo_canh: S({}), nhan_vat: mang, vi_tri: S({}), hanh_dong: S({}), loi: S({}), hinh: S({}) },
            required: ['bo_canh', 'nhan_vat', 'vi_tri', 'hanh_dong', 'loi', 'hinh'],
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
      viTri: cat(c.vi_tri, 200),
      hanhDong: cat(c.hanh_dong, 500),
      loi: cat(c.loi, 900),
      hinh: cat(c.hinh, 600),
    }))
    .filter((c) => c.hanhDong || c.loi)
    .slice(0, 22)
  return {
    ok: true,
    danhGia: {
      tongThe: cat(k.tong_the, 800),
      diemManh: ds2(k.diem_manh),
      diemYeu: (k.diem_yeu ?? [])
        .map((x) => ({ yeu: cat(x.diem_yeu, 400), manh: cat(x.bien_thanh_diem_manh, 500), canh: cat(x.canh, 100) }))
        .filter((x) => x.yeu)
        .slice(0, 10),
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

// ---------------- Agent: AI ĐẠO DIỄN cho xưởng phim 2D trên máy (LAM_PHIM.bat) ----------------
// Chỉ được chọn tài nguyên có trong danh mục (danhMuc2d.ts sinh từ máy), để máy dựng được tự động.
const HD_MAY = [...HANH_DONG_2D] as string[]
const DO_CAM = Object.entries(DAO_CU_2D).filter(([, v]) => v.cam).map(([m]) => m)
const XE_CHO = Object.entries(DAO_CU_2D).filter(([, v]) => v.xe).map(([m]) => m)
const HE_MAY = `Bạn là AI ĐẠO DIỄN của một xưởng phim hoạt hình 2D. Bạn chuyển phim đã viết thành KỊCH BẢN DÀN DỰNG cho máy tự dựng.
Máy CHỈ dựng được các tài nguyên trong danh mục dưới đây, tuyệt đối không bịa mã khác.

KHU VỰC (bối cảnh.khu): ${Object.entries(KHU_VUC_2D).map(([m, t]) => `${m} (${t})`).join('; ')}
ÁNH SÁNG: ${Object.entries(ANH_SANG_2D).map(([m, t]) => `${m}=${t}`).join(', ')}
THỜI TIẾT: ${Object.entries(THOI_TIET_2D).map(([m, t]) => `${m}=${t}`).join(', ')}
HÀNH ĐỘNG: ${HD_MAY.join(', ')}; tương tác đồ: cam (cầm một đồ), dat (đặt đồ đang cầm xuống), dua (đưa đồ đang cầm cho người khác)
ĐỒ CẦM ĐƯỢC: ${DO_CAM.map((m) => `${m} (${DAO_CU_2D[m].ten})`).join(', ')}
XE CHỞ NGƯỜI: ${XE_CHO.map((m) => `${m} (${DAO_CU_2D[m].ten}${DAO_CU_2D[m].cho_khach ? ', chở thêm 1 khách' : ''})`).join(', ')}; đi xe: lai (doi_tuong = mã xe), ngoi_xe (doi_tuong = tên người đang lái), xuong_xe
HIỆU ỨNG: ${Object.entries(HIEU_UNG_2D).map(([m, t]) => `${m}=${t}`).join(', ')}
GÓC MÁY: ${Object.entries(MAY_QUAY_2D).map(([m, t]) => `${m}=${t}`).join(', ')}
CẢM XÚC: ${Object.entries(CAM_XUC_2D).map(([m, t]) => `${m}=${t}`).join(', ')}
CHUYỂN CẢNH (khi sang khu vực mới): ${Object.entries(CHUYEN_CANH_2D).map(([m, t]) => `${m}=${t}`).join(', ')}
DÁNG NGƯỜI: ${Object.entries(DANG_NGUOI_2D).map(([m, t]) => `${m}=${t}`).join(', ')}
PHỤ KIỆN: ${Object.entries(PHU_KIEN_2D).map(([m, t]) => `${m}=${t}`).join(', ')}

Quy tắc dàn dựng:
1. Tách lời mỗi cảnh thành từng dòng ngắn (tối đa ~25 chữ). Câu nhân vật nói thì ai = đúng tên nhân vật (chép nguyên văn). Câu kể chuyện thì ai = "KE". Bỏ các cụm dẫn kiểu "Tôi hỏi:", "Vợ cười:" và biến chúng thành hành động.
2. LỜI KỂ PHẢI KHỚP HÌNH: dòng của "KE" bắt buộc có dien = nhân vật đang làm đúng việc được kể, và hanh_dong / doi_tuong thể hiện việc đó (kể "tôi giấu tiền" thì dien = người kể, hanh_dong = cam, doi_tuong = tien).
3. Chọn khu vực đúng nơi câu chuyện xảy ra; đổi khu vực khi truyện chuyển chỗ; không để quá 2 đoạn liền nhau cùng một khu vực nếu truyện không bắt buộc.
4. Ánh sáng theo thời điểm trong truyện (đêm thì dem, đoạn nhớ lại thì hoi_tuong, căng thẳng thì kich_tinh).
5. Đồ vật: khi lời nhắc tới một đồ có trong danh mục thì cho nhân vật cam đồ đó; muốn trao cho người khác thì dòng sau dùng dua với doi_tuong = tên người nhận. Đồ đang cầm phải được cầm trước rồi mới dat / dua.
6. Góc máy có chủ đích: mở đầu mỗi khu vực bằng toan hoặc rat_rong; đối thoại xen trung, can, qua_vai; khoảnh khắc sốc dùng dac_ta hoặc day_vao; nhân vật yếu thế goc_cao, oai vệ goc_thap; người chạy dùng lia; kết phim keo_ra.
7. Hiệu ứng chỉ dùng khi đúng cảm xúc (mồ hôi khi bối rối, tim khi yêu, khói khi tức...). Khoảng một nửa số dòng có hành động, không lạm dụng.
8. Dòng chỉ có hành động, không lời: loi = "" và dien = người làm.
11. DIỄN BẰNG HÀNH ĐỘNG, không để nhân vật chỉ đứng nói. Mỗi việc trong truyện phải được làm ra bằng hành động tương tác có đủ trình tự, máy tự diễn các bước chuẩn bị - tiếp cận - chạm - làm - kết thúc:
   goi_dien (áp điện thoại lên tai), xem_dien_thoai (cúi nhìn màn hình), deo_tai_nghe / thao_tai_nghe, uong (nâng cốc lên miệng), an,
   mo_cua / dong_cua, ra_cua (đi ra khỏi phòng qua cửa), vao_cua (bước vào qua cửa), ngoi_ghe / dung_day, go_may_tinh (ngồi gõ laptop),
   bat_den / tat_den (phòng sáng hoặc tối hẳn), dat_len_ban (đặt đồ đang cầm lên bàn), cam / dat / dua.
   Nhân vật mới xuất hiện trong phòng thì nên vao_cua; rời phòng thì ra_cua. Gọi điện thì goi_dien chứ không chỉ cầm điện thoại.
12. Với mỗi dòng có hành động, ghi vào phan_tich một câu ngắn: nhân vật muốn làm gì → chạm vào đồ gì → kết quả. Hành động phải khớp đúng với lời nói và lời kể của dòng đó.
10. Đi xe: người lái "lai" một xe trong danh sách XE CHỞ NGƯỜI, người đi cùng "ngoi_xe" với doi_tuong = tên người lái, rồi người lái "di" hoặc "chay" là cả xe chạy; tới nơi thì người lái "xuong_xe". Đổi khu vực thì tự xuống xe.
9. Thiết kế nhân vật theo mô tả: dang (nam, nu, gia, be_trai, be_gai), phu_kien (chọn trong danh sách, có thể rỗng), mau_ao, mau_quan, mau_toc dạng #RRGGBB theo đúng mô tả ngoại hình (để rỗng nếu mô tả không nói). Giữ cố định suốt phim.
13. Mỗi dòng có cam_xuc đúng tâm trạng nhân vật lúc đó (vui, buồn, giận, sợ, ngạc nhiên, suy tư...), để khuôn mặt diễn theo. Khi đổi khu vực chọn chuyen_canh hợp nhịp truyện (tron cho cảnh hài kết thúc, mo_dan cho thời gian trôi, quet cho đổi chỗ nhanh, cat cho liền mạch).
14. Vật lý: nem (ném đồ đang cầm, doi_tuong = người bị ném trúng hoặc rỗng), lam_roi (làm rơi đồ đang cầm).
${CAM_CHUNG}`

export type DongMay = { canh: string; anhSang: string; thoiTiet: string; chuyen: string; ai: string; dien: string; hanhDong: string; doiTuong: string; hieuUng: string; mayQuay: string; camXuc: string; loi: string }
export type NhanVatMay = { ten: string; loai: string; phuKien: string[]; mau: Record<string, string> }
export async function agentLamPhimMay(phim: { ten: string; nhanVat: { ten: string; moTa: string }[]; canh: { loi: string; hinh: string; boiCanh?: string }[] }): Promise<KetQua<{ nhanVat: NhanVatMay[]; dong: DongMay[] }>> {
  const nv = phim.nhanVat.filter((n) => n.ten.trim()).slice(0, 12)
  const canh = phim.canh.filter((c) => c.loi.trim()).slice(0, 40)
  if (!canh.length) return { ok: false, thongBao: 'Bảng cảnh chưa có lời đọc nào' }
  const r = await goiAgent<{ nhan_vat?: { ten?: string; dang?: string; phu_kien?: string[]; mau_ao?: string; mau_quan?: string; mau_toc?: string }[]; dong?: Record<string, string>[] }>(
    HE_MAY,
    `Tên phim: ${cat(phim.ten, 120)}\n\nNhân vật (chỉ dùng đúng các tên này):\n${nv.map((n) => `- ${cat(n.ten, 40)}: ${cat(n.moTa, 300)}`).join('\n')}\n\nCác cảnh theo thứ tự:\n${canh.map((c, i) => `${i + 1}. [nơi: ${cat(c.boiCanh, 80) || '?'}; hình: ${cat(c.hinh, 300)}] Lời: ${cat(c.loi, 1000)}`).join('\n')}`,
    {
      type: 'OBJECT',
      properties: {
        nhan_vat: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ten: S({}), dang: S({ enum: Object.keys(DANG_NGUOI_2D) }), phu_kien: { type: 'ARRAY', items: S({ enum: Object.keys(PHU_KIEN_2D) }) }, mau_ao: S({}), mau_quan: S({}), mau_toc: S({}) }, required: ['ten', 'dang', 'phu_kien', 'mau_ao', 'mau_quan', 'mau_toc'] } },
        dong: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              canh: S({ enum: [...DS_KHU_2D] }), anh_sang: S({ enum: Object.keys(ANH_SANG_2D) }), thoi_tiet: S({ enum: Object.keys(THOI_TIET_2D) }),
              ai: S({}), dien: S({}), phan_tich: S({}), hanh_dong: S({}), doi_tuong: S({}), hieu_ung: S({}), may_quay: S({}), cam_xuc: S({}), chuyen_canh: S({}), loi: S({}),
            },
            required: ['canh', 'anh_sang', 'thoi_tiet', 'ai', 'dien', 'phan_tich', 'hanh_dong', 'doi_tuong', 'hieu_ung', 'may_quay', 'cam_xuc', 'chuyen_canh', 'loi'],
          },
        },
      },
      required: ['nhan_vat', 'dong'],
    },
    0.5,
  )
  if (!r.ok) return r
  // Khớp tên AI trả về với tên thật (không phân biệt hoa thường, chấp nhận thiếu/thừa danh xưng như "Chị Na" / "Na")
  const thuong = (x: unknown) => cat(x, 60).toLowerCase().normalize('NFC')
  const khop = (x: unknown): string | null => {
    const t = thuong(x)
    if (!t || t === 'ke') return null
    return nv.find((n) => thuong(n.ten) === t)?.ten.trim() ?? nv.find((n) => thuong(n.ten).includes(t) || t.includes(thuong(n.ten)))?.ten.trim() ?? null
  }
  const nhanVat = (r.kq.nhan_vat ?? []).flatMap((n) => {
    const t = khop(n.ten)
    const hex = (x: unknown) => (/^#[0-9a-f]{6}$/i.test(String(x)) ? String(x) : '')
    const mau: Record<string, string> = {}
    if (hex(n.mau_ao)) mau.ao = hex(n.mau_ao)
    if (hex(n.mau_quan)) mau.quan = hex(n.mau_quan)
    if (hex(n.mau_toc)) mau.toc = hex(n.mau_toc)
    return t ? [{ ten: t, loai: n.dang && n.dang in DANG_NGUOI_2D ? n.dang : 'nam', phuKien: (n.phu_kien ?? []).filter((p) => p in PHU_KIEN_2D), mau }] : []
  })
  const trong = (v: unknown, ds: string[]) => (ds.includes(String(v)) ? String(v) : '')
  const dong: DongMay[] = []
  const dangCam = new Map<string, string>()
  const dangLai = new Map<string, string>()
  const dangNgoi = new Set<string>()
  let canhTruoc = ''
  for (const d of r.kq.dong ?? []) {
    const ai = khop(d.ai) ?? 'KE'
    const dien = khop(d.dien) ?? (ai === 'KE' ? '' : ai)
    let hanhDong = trong(d.hanh_dong, [...HD_MAY, 'cam', 'dat', 'dua', 'lai', 'ngoi_xe', 'xuong_xe'])
    let doiTuong = ''
    if (hanhDong === 'cam') doiTuong = trong(d.doi_tuong, DO_CAM)
    if (hanhDong === 'dua' || hanhDong === 'ngoi_xe') doiTuong = khop(d.doi_tuong) ?? ''
    if (hanhDong === 'lai') doiTuong = trong(d.doi_tuong, XE_CHO)
    const canhNay = trong(d.canh, [...DS_KHU_2D]) || 'nha.phong_khach'
    if (canhNay !== canhTruoc) dangLai.clear()
    canhTruoc = canhNay
    // máy sẽ báo lỗi nếu thiếu: bỏ những hành động không đủ thông tin thay vì làm hỏng cả kịch bản
    const xeCuaLai = dangLai.get(doiTuong)
    if (!dien || (hanhDong === 'cam' && !doiTuong) || (hanhDong === 'dua' && (!doiTuong || !dangCam.get(dien))) || ((hanhDong === 'dat' || hanhDong === 'dat_len_ban') && !dangCam.get(dien)) ||
      (hanhDong === 'lai' && !doiTuong) || (hanhDong === 'ngoi_xe' && (!xeCuaLai || !DAO_CU_2D[xeCuaLai]?.cho_khach)) || (hanhDong === 'xuong_xe' && !dangLai.has(dien) && !dangNgoi.has(dien))) {
      hanhDong = ''
      doiTuong = ''
    }
    if (hanhDong === 'cam') dangCam.set(dien, doiTuong)
    if (hanhDong === 'dat' || hanhDong === 'dat_len_ban') dangCam.delete(dien)
    if (hanhDong === 'lai') dangLai.set(dien, doiTuong)
    if (hanhDong === 'ngoi_xe') dangNgoi.add(dien)
    if (hanhDong === 'xuong_xe') {
      if (dangLai.has(dien)) dangNgoi.clear()
      dangLai.delete(dien)
      dangNgoi.delete(dien)
    }
    if (hanhDong === 'dua') {
      dangCam.set(doiTuong, dangCam.get(dien) ?? '')
      dangCam.delete(dien)
    }
    const loi = cat(d.loi, 300).replace(/[\r\n:[\]{}()]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!loi && !hanhDong) continue
    dong.push({
      canh: canhNay,
      anhSang: trong(d.anh_sang, Object.keys(ANH_SANG_2D)) || 'sang',
      thoiTiet: trong(d.thoi_tiet, Object.keys(THOI_TIET_2D)) || 'nang',
      ai, dien, hanhDong, doiTuong,
      hieuUng: trong(d.hieu_ung, Object.keys(HIEU_UNG_2D)),
      camXuc: trong(d.cam_xuc, Object.keys(CAM_XUC_2D)),
      chuyen: trong(d.chuyen_canh, Object.keys(CHUYEN_CANH_2D)),
      mayQuay: trong(d.may_quay, Object.keys(MAY_QUAY_2D)),
      loi,
    })
  }
  if (!dong.length) return { ok: false, thongBao: 'AI chưa chuyển được kịch bản, hãy bấm thử lại' }
  return { ok: true, nhanVat, dong }
}

// ---------------- Agent: HỌA SĨ ĐẠO CỤ (Gemini vẽ đạo cụ 2D bằng dữ liệu hình học) ----------------
export type NetVe = { k: 'r' | 'e' | 'p' | 's' | 'l'; so: number[]; mau: string; vien: boolean }
export type XeMoi = { lai: number[]; khach: number[]; banh: number[]; kieu: 'dap' | 'ngoi'; truoc: boolean }
export type DaoCuMoi = { ma: string; ten: string; nhom: string; cam: boolean; thoiDai: string; noi: string[]; hinh: NetVe[]; xe?: XeMoi }
const NHOM_DO = ['noi_that', 'cong_nghe', 'van_phong', 'an_uong', 'sinh_hoat', 'lao_dong', 'giao_thong', 'lich_su', 'dong_vat', 'thuc_vat', 'moi_truong', 'dac_biet']
// Mô hình vẽ: mạnh hơn mô hình viết chữ (đặt GEMINI_MODEL_VE trên Vercel để chọn khác)
const MO_HINH_VE = [process.env.GEMINI_MODEL_VE?.trim() ?? '', 'gemini-3.5-flash', 'gemini-3-flash', 'gemini-2.5-flash']
const VI_DU_DO = JSON.stringify({
  ma: 'coc_ca_phe_sua', ten: 'Cốc cà phê sữa', nhom: 'an_uong', cam: true, thoi_dai: 'hien_dai', noi: ['quan_ca_phe'],
  hinh: [
    { k: 'e', so: [0.34, 0.02, 0.17, 0.2], mau: '#F4F1EA', vien: true },
    { k: 's', so: [-0.34, 0.38, 0.3, 0.38, 0.26, -0.36, -0.3, -0.36], mau: '#F4F1EA', vien: true },
    { k: 's', so: [0.12, 0.36, 0.3, 0.36, 0.26, -0.34, 0.08, -0.34], mau: '#D9D3C7', vien: false },
    { k: 'e', so: [-0.02, 0.37, 0.31, 0.06], mau: '#8A5A3B', vien: true },
    { k: 'e', so: [-0.08, 0.38, 0.12, 0.025], mau: '#C49A72', vien: false },
    { k: 'r', so: [-0.3, -0.05, 0.27, 0.05], mau: '#C8553D', vien: false },
    { k: 'l', so: [-0.22, 0.25, -0.22, -0.2, 0.03], mau: '#FFFFFF', vien: false },
    { k: 's', so: [-0.08, 0.5, -0.02, 0.62, -0.1, 0.74, -0.04, 0.84], mau: '#E3E3E3', vien: false },
  ],
})
const HE_DO = `Bạn là HỌA SĨ ĐẠO CỤ chính của một studio hoạt hình 2D chuyên nghiệp. Phong cách: hoạt hình 2D phẳng hiện đại, nét viền đen gọn, màu phẳng hài hòa có SẮC ĐỘ (không dùng màu thuần chói như #FF0000, #00FF00), hình khối tròn trịa dễ thương, nhìn THẲNG từ phía trước.
Bạn vẽ mỗi đạo cụ bằng danh sách NÉT hình học, nét sau đè lên nét trước:
- k="r": chữ nhật, so=[x0,z0,x1,z1]
- k="e": elip, so=[tâm_x, tâm_z, bán_kính_x, bán_kính_z]
- k="p": đa giác góc cạnh, so=[x1,z1, x2,z2, ...] (ít nhất 3 điểm)
- k="s": đa giác bo tròn mềm, so như "p" (dùng cho hình hữu cơ: thân xe, lá, thú, túi, gối)
- k="l": nét bút dày đầu tròn, so=[x0,z0,x1,z1, độ_dày]
mau = mã hex "#RRGGBB". vien=true: có viền đen (khối chính). vien=false: lớp phủ không viền (bóng, sáng, hoa văn, chi tiết nhỏ).

KỸ THUẬT VẼ ĐẸP (bắt buộc):
1. Dựng KHỐI CHÍNH trước (vien=true), mỗi bộ phận lớn một nét riêng (thân, nắp, chân, tay cầm, bánh xe...).
2. Đổ BÓNG: ánh sáng chiếu từ TRÊN-TRÁI, nên phủ một mảng tối hơn màu nền khoảng 20% ở phía PHẢI hoặc phía DƯỚI mỗi khối lớn (vien=false), nằm gọn bên trong khối.
3. Điểm SÁNG: một vệt hoặc chấm sáng hơn khoảng 25% ở phía TRÊN-TRÁI các khối bóng bẩy (kính, kim loại, nhựa, quả cây).
4. CHI TIẾT ĐẶC TRƯNG: 3-8 chi tiết nhỏ làm vật thật hơn (nút bấm, đường may, vân gỗ, ốc vít, nhãn dán, cánh hoa, mắt mũi con vật, khe tản nhiệt, hoa văn).
5. Tổng 12-30 nét. Bảng màu 3-6 màu chính hài hòa cùng các sắc độ sáng/tối của chúng.
6. Tỷ lệ đúng vật thật so với người cao 6.7 đơn vị (bàn tay rộng 0.6): điện thoại cao ~0.8, cốc ~0.7, sách ~1.0, ghế ~3, bàn ~2.2, tủ lạnh ~4.6, xe máy dài ~4, ô tô dài ~7, cây ~5-6, con mèo dài ~1.6, con trâu dài ~5.
7. Đồ cầm tay (cam=true): vẽ quanh điểm nắm (0,0). Đồ đặt / nội thất / xe / cây / con vật (cam=false): đáy chạm z=0, căn giữa x=0. Hệ tọa độ: z hướng LÊN.
8. Không vẽ chữ. Con vật nhìn nghiêng sang phải, có mắt to tròn dễ thương.
9. TỰ KIỂM TRA trước khi trả lời: hình có nhận ra ngay là vật gì không, các nét có khớp nhau không bị hở, bóng và sáng đã đúng phía chưa; nếu chưa thì sửa lại.

VÍ DỤ một đạo cụ đạt chuẩn (cốc cà phê sữa, cầm tay):
${VI_DU_DO}

ma: mã không dấu viết thường nối "_" (vd "xe_xich_lo"). ten: tên tiếng Việt có dấu. nhom: một trong ${NHOM_DO.join(', ')}.
XE CHỞ NGƯỜI ĐƯỢC (xe đạp, xe máy, xích lô, ô tô, xe buýt, thuyền, xe bò, kiệu...): vẽ nhìn NGANG, đầu xe quay sang PHẢI, và điền xe_kieu ("dap" nếu người lái đạp chân, "ngoi" nếu ngồi yên), xe_lai = [x, z] điểm giữa mặt yên người lái, xe_khach = [x, z] mặt ghế khách (mảng rỗng nếu không chở khách), xe_banh = [tâm_x, tâm_z, bán_kính, ...] mỗi bánh 3 số (mảng rỗng nếu không có bánh), xe_truoc = true nếu thân xe che trước người ngồi (ô tô, xe buýt). Đồ không phải xe: xe_kieu = "khong", các mảng rỗng.
thoi_dai: "hien_dai" (đồ chỉ có thời nay), "co_xua" (đồ chỉ có thời xưa) hoặc "moi_thoi". noi: các nơi hay có món này, chọn trong: nha, chung_cu, quan_ca_phe, van_phong, truong, duong, cong_vien, cho.`

export async function agentVeDaoCu(moTa: string[]): Promise<KetQua<{ daoCu: DaoCuMoi[] }>> {
  const ds = moTa.map((m) => cat(m, 220)).filter(Boolean).slice(0, 4)
  if (!ds.length) return { ok: false, thongBao: 'Hãy nhập tên đạo cụ cần vẽ' }
  const r = await goiAgent<{ dao_cu?: { ma?: string; ten?: string; nhom?: string; cam?: boolean; thoi_dai?: string; noi?: string[]; hinh?: { k?: string; so?: number[]; mau?: string; vien?: boolean }[]; xe_kieu?: string; xe_lai?: number[]; xe_khach?: number[]; xe_banh?: number[]; xe_truoc?: boolean }[] }>(
    HE_DO,
    `Vẽ các đạo cụ sau (mỗi dòng một món):\n${ds.map((m) => `- ${m}`).join('\n')}`,
    {
      type: 'OBJECT',
      properties: {
        dao_cu: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              ma: S({}), ten: S({}), nhom: S({ enum: NHOM_DO }), cam: { type: 'BOOLEAN' }, thoi_dai: S({ enum: ['hien_dai', 'co_xua', 'moi_thoi'] }),
              noi: { type: 'ARRAY', items: S({}) },
              hinh: { type: 'ARRAY', items: { type: 'OBJECT', properties: { k: S({ enum: ['r', 'e', 'p', 's', 'l'] }), so: { type: 'ARRAY', items: { type: 'NUMBER' } }, mau: S({}), vien: { type: 'BOOLEAN' } }, required: ['k', 'so', 'mau', 'vien'] } },
              xe_kieu: S({ enum: ['khong', 'dap', 'ngoi'] }), xe_lai: { type: 'ARRAY', items: { type: 'NUMBER' } }, xe_khach: { type: 'ARRAY', items: { type: 'NUMBER' } },
              xe_banh: { type: 'ARRAY', items: { type: 'NUMBER' } }, xe_truoc: { type: 'BOOLEAN' },
            },
            required: ['ma', 'ten', 'nhom', 'cam', 'thoi_dai', 'noi', 'hinh', 'xe_kieu', 'xe_lai', 'xe_khach', 'xe_banh', 'xe_truoc'],
          },
        },
      },
      required: ['dao_cu'],
    },
    0.6,
    MO_HINH_VE,
  )
  if (!r.ok) return r
  const CAN = { r: 4, e: 4, l: 5 } as Record<string, number>
  const daoCu = (r.kq.dao_cu ?? []).flatMap((d) => {
    const hinh = (d.hinh ?? []).flatMap((n) => {
      const k = String(n.k) as NetVe['k']
      const so = (n.so ?? []).map(Number).filter((x) => Number.isFinite(x) && Math.abs(x) < 40).map((x) => Math.round(x * 100) / 100)
      const du = k in CAN ? so.length === CAN[k] : (k === 'p' || k === 's') && so.length >= 6 && so.length % 2 === 0
      const mau = /^#[0-9a-f]{6}$/i.test(String(n.mau)) ? String(n.mau).toUpperCase() : ''
      return ['r', 'e', 'p', 's', 'l'].includes(k) && du && mau ? [{ k, so, mau, vien: !!n.vien }] : []
    })
    const ma = cat(d.ma, 40).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!ma || hinh.length < 3) return []
    const so = (a?: number[]) => (a ?? []).map(Number).filter((x) => Number.isFinite(x) && Math.abs(x) < 40)
    const lai = so(d.xe_lai).slice(0, 2)
    const banh = so(d.xe_banh)
    const xe: XeMoi | undefined = (d.xe_kieu === 'dap' || d.xe_kieu === 'ngoi') && lai.length === 2 && banh.length >= 3
      ? { lai, khach: so(d.xe_khach).slice(0, 2), banh: banh.slice(0, banh.length - (banh.length % 3)), kieu: d.xe_kieu, truoc: !!d.xe_truoc }
      : undefined
    return [{
      ma, ten: cat(d.ten, 60) || ma, nhom: NHOM_DO.includes(String(d.nhom)) ? String(d.nhom) : 'dac_biet', cam: !!d.cam,
      thoiDai: ['hien_dai', 'co_xua', 'moi_thoi'].includes(String(d.thoi_dai)) ? String(d.thoi_dai) : 'moi_thoi',
      noi: (d.noi ?? []).map((x) => cat(x, 20)).filter((x) => ['nha', 'chung_cu', 'quan_ca_phe', 'van_phong', 'truong', 'duong', 'cong_vien', 'cho'].includes(x)),
      hinh,
      ...(xe ? { xe, cam: false } : {}),
    }]
  })
  if (!daoCu.length) return { ok: false, thongBao: 'AI chưa vẽ được, hãy bấm thử lại' }
  return { ok: true, daoCu }
}

// ---------------- Agent: TÌM ĐẠO CỤ CÒN THIẾU (đọc truyện, so với thư viện) ----------------
const HE_THIEU = `Bạn là TRỢ LÝ ĐẠO CỤ của xưởng phim hoạt hình 2D. Đọc câu chuyện và liệt kê những ĐỒ VẬT, XE CỘ, CON VẬT, CÂY CỐI mà hình ảnh phim cần thể hiện để người xem hiểu đúng lời kể và lời thoại.
Chỉ liệt kê món THƯ VIỆN CHƯA CÓ (đã có thì bỏ, kể cả khi tên gọi khác nhưng cùng một vật). Không liệt kê người, nơi chốn, tường, sàn, trời.
Ưu tiên món nhân vật cầm, đưa, dùng hoặc được nhắc đích danh; sau đó là đồ trang trí làm rõ bối cảnh và thời đại của truyện.
Mỗi món: ten (tiếng Việt có dấu, ngắn) và mo_ta (hình dáng, màu sắc đặc trưng để họa sĩ vẽ, 1 câu), ly_do (cảnh nào cần, ngắn). Tối đa 24 món. ${CAM_CHUNG}`

export async function agentTimDaoCuThieu(phim: { ten: string; yChinh: string; canh: { loi: string; hinh: string }[] }, daCo: string[]): Promise<KetQua<{ thieu: { ten: string; moTa: string; lyDo: string }[] }>> {
  const canh = phim.canh.filter((c) => c.loi.trim() || c.hinh.trim()).slice(0, 80)
  if (!canh.length && cat(phim.yChinh, 20).length < 20) return { ok: false, thongBao: 'Chưa có câu chuyện hay kịch bản để đọc' }
  const r = await goiAgent<{ thieu?: { ten?: string; mo_ta?: string; ly_do?: string }[] }>(
    HE_THIEU,
    `THƯ VIỆN ĐÃ CÓ: ${daCo.map((x) => cat(x, 60)).join(', ')}\n\nTÊN PHIM: ${cat(phim.ten, 120)}\nÝ CHÍNH: ${cat(phim.yChinh, 2000)}\n\nCÁC CẢNH:\n${canh.map((c, i) => `${i + 1}. Lời: ${cat(c.loi, 600)} | Hình: ${cat(c.hinh, 300)}`).join('\n')}`,
    {
      type: 'OBJECT',
      properties: { thieu: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ten: S({}), mo_ta: S({}), ly_do: S({}) }, required: ['ten', 'mo_ta', 'ly_do'] } } },
      required: ['thieu'],
    },
    0.3,
  )
  if (!r.ok) return r
  const thieu = (r.kq.thieu ?? []).map((t) => ({ ten: cat(t.ten, 60), moTa: cat(t.mo_ta, 200), lyDo: cat(t.ly_do, 120) })).filter((t) => t.ten).slice(0, 24)
  return { ok: true, thieu }
}

// ---------------- TƯ LIỆU: lấy cốt truyện từ Bách khoa toàn thư (Wikipedia tiếng Việt) ----------------
const WIKI = 'https://vi.wikipedia.org/w/api.php'
const DAU_WIKI = { 'user-agent': 'XuongPhim2D/1.0 (cong cu lam phim tu lieu)' }

export async function layBachKhoa(chuDe: string): Promise<KetQua<{ tieuDe: string; url: string; noiDung: string }>> {
  if (!(await daMoKhoa())) return { ok: false, thongBao: CHUA_MO }
  const q = cat(chuDe, 150)
  if (q.length < 2) return { ok: false, thongBao: 'Hãy gõ chủ đề cần tra' }
  try {
    const tim = await fetch(`${WIKI}?action=query&format=json&list=search&srlimit=1&srsearch=${encodeURIComponent(q)}`, { headers: DAU_WIKI, cache: 'no-store', signal: AbortSignal.timeout(15_000) }).then((r) => r.json())
    const tieuDe: string | undefined = tim?.query?.search?.[0]?.title
    if (!tieuDe) return { ok: false, thongBao: `Bách khoa toàn thư tiếng Việt không có bài nào về "${q}"` }
    const bai = await fetch(`${WIKI}?action=query&format=json&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&titles=${encodeURIComponent(tieuDe)}`, { headers: DAU_WIKI, cache: 'no-store', signal: AbortSignal.timeout(20_000) }).then((r) => r.json())
    const trang = Object.values(bai?.query?.pages ?? {})[0] as { title?: string; extract?: string } | undefined
    const dung = (trang?.extract ?? '').split(/\n(?:Xem thêm|Chú thích|Tham khảo|Liên kết ngoài|Đọc thêm|Ghi chú|Thư mục)\s*\n/)[0]
    const noiDung = dung.split(/\n+/).map((d) => d.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim()).filter((d) => d.length > 30).join('\n')
    if (noiDung.length < 300) return { ok: false, thongBao: `Bài "${tieuDe}" quá ngắn để làm phim` }
    return { ok: true, tieuDe: trang?.title ?? tieuDe, url: `https://vi.wikipedia.org/wiki/${encodeURIComponent((trang?.title ?? tieuDe).replace(/ /g, '_'))}`, noiDung: noiDung.slice(0, 20000) }
  } catch (e) {
    return { ok: false, thongBao: e instanceof Error ? `Không lấy được bài: ${e.message}` : 'Không lấy được bài' }
  }
}

// Mọi người được nhắc trong bài → nhân vật (chính, phụ, khác), ngoại hình hợp thời đại, có giọng để thoại
const HE_NV_TL = `Bạn là AGENT TUYỂN VAI cho phim hoạt hình 2D chuyển thể từ tư liệu bách khoa toàn thư.
Đọc tư liệu và lập danh sách NHÂN VẬT gồm MỌI người được nhắc tới có vai trò trong câu chuyện (tối đa 12): nhân vật chính (người mà bài viết về), các nhân vật phụ (gia đình, thầy, bạn, đồng nghiệp, đối thủ, người cộng sự...) và vài nhân vật khác cần để kể chuyện (có thể là vai chung như "Thầy giáo", "Phóng viên" nếu bài nhắc mà không nêu tên).
Mỗi nhân vật: ten (đúng tên trong bài), vai ("chinh", "phu" hoặc "khac"), mo_ta (ngoại hình cố định hợp tuổi, thời đại, quê quán: giới tính, tuổi, tóc, trang phục với màu cụ thể, có đeo kính không), tinh_cach (vai trò trong đời nhân vật chính, 1 câu), giong (giọng nói: nam/nữ, tuổi, sắc thái).
Chỉ dựa trên tư liệu, không bịa thêm người không có. ${CAM_CHUNG.replace('Không dùng tên, hình ảnh của người thật, người nổi tiếng, nhân vật của phim hay kênh khác, nhãn hiệu thật. ', '')}`

export async function agentNhanVatTuLieu(tieuDe: string, noiDung: string): Promise<KetQua<{ nhanVat: (NhanVatAi & { vai: string })[] }>> {
  const r = await goiAgent<{ nhan_vat?: { ten?: string; vai?: string; mo_ta?: string; tinh_cach?: string; giong?: string }[] }>(
    HE_NV_TL,
    `TƯ LIỆU: ${cat(tieuDe, 120)}\n\n${cat(noiDung, 12000)}`,
    { type: 'OBJECT', properties: { nhan_vat: { type: 'ARRAY', items: { type: 'OBJECT', properties: { ten: S({}), vai: S({ enum: ['chinh', 'phu', 'khac'] }), mo_ta: S({}), tinh_cach: S({}), giong: S({}) }, required: ['ten', 'vai', 'mo_ta', 'tinh_cach', 'giong'] } } }, required: ['nhan_vat'] },
    0.4,
  )
  if (!r.ok) return r
  const thu = { chinh: 0, phu: 1, khac: 2 } as Record<string, number>
  const nhanVat = (r.kq.nhan_vat ?? [])
    .map((n) => ({ ten: cat(n.ten, 40), vai: String(n.vai ?? 'khac'), moTa: cat(n.mo_ta, 400), tinhCach: `${n.vai === 'chinh' ? 'Nhân vật chính. ' : n.vai === 'phu' ? 'Nhân vật phụ. ' : ''}${cat(n.tinh_cach, 200)}`, giong: cat(n.giong, 150) }))
    .filter((n) => n.ten)
    .sort((a, b) => (thu[a.vai] ?? 2) - (thu[b.vai] ?? 2))
    .slice(0, 12)
  if (!nhanVat.length) return { ok: false, thongBao: 'AI chưa tìm được nhân vật trong bài, hãy thử lại' }
  return { ok: true, nhanVat }
}

// ---------------- Agent 4: câu lệnh video ----------------
const HE_VD = (giay: number) => `Bạn là AGENT ĐẠO DIỄN VIDEO. Với từng cảnh, viết diễn biến để AI tạo video (như Veo trong Gemini) dựng một đoạn ${giay} giây liền mạch, bắt đầu từ ảnh khung đầu của cảnh.
Với mỗi cảnh (giữ đúng số "so"):
- dien_bien: 3-4 mốc thời gian liền nhau phủ kín từ 0 đến ${giay} giây. Mỗi mốc tả chính xác cử động nhìn thấy: ai, bộ phận nào, làm gì, biểu cảm ra sao. Khớp lời thoại: ai đang nói thì miệng người đó cử động, người kia phản ứng.
- may_quay: một câu về cỡ cảnh và chuyển động máy (đứng yên, đẩy chậm vào, lia nhẹ...). Không cắt cảnh, không đổi góc đột ngột.
- am_thanh: tiếng nền và tiếng động cụ thể của cảnh. Không nhạc có lời.
Chỉ dùng những gì có trong cảnh: không thêm nhân vật, đồ vật hay nơi chốn mới, không đổi quần áo, nhân vật giữ đúng bên trái / phải như phần Vị trí. Mốc cuối cùng phải dừng ở tư thế mà cảnh sau (nếu cùng bối cảnh) có thể bắt đầu. Hành động nhỏ, vừa sức ${giay} giây. Tiếng Việt có dấu.`

export async function agentVideo(
  giay: number,
  canh: { boiCanh: string; nhanVat: string[]; viTri: string; hanhDong: string; loi: string; hinh: string }[],
): Promise<KetQua<{ video: (VideoAi | null)[] }>> {
  const g = giay === 10 ? 10 : 8
  if (!canh.length) return { ok: false, thongBao: 'Chưa có cảnh nào, hãy chạy agent kịch bản trước' }
  const ds = canh
    .slice(0, 20)
    .map((c, i) => `Cảnh so=${i + 1}\n- Bối cảnh: ${cat(c.boiCanh, 80)}\n- Nhân vật: ${c.nhanVat.join(', ') || '(không rõ)'}\n- Vị trí: ${cat(c.viTri, 200) || '(không rõ)'}\n- Khung đầu: ${cat(c.hinh, 400)}\n- Hành động: ${cat(c.hanhDong, 400)}\n- Lời thoại: ${cat(c.loi, 400) || '(không có)'}`)
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
