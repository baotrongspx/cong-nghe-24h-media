'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { LoiFacebook, anBinhLuan, guiTinNhan, nhanRiengBinhLuan, traLoiBinhLuan } from '@/lib/facebook'
import { COT_TRANG, luuTin, type Trang } from '@/lib/hopThu'
import { goiHieuLuc, timGoi } from '@/lib/goiCuoc'
import { COT_DON, noiDungXacNhan, type DonHang } from '@/lib/donHang'
import { AP_DUNG, type ApDung } from '@/lib/tuDong'
import { coKhoaGemini } from '@/lib/gemini'
import { THE_CAN_NGUOI, thuAi } from '@/lib/troLyAi'
import { batBuocDangNhap, batBuocQuanTri, locDonHang, locHoiThoai } from '@/lib/phien'

export type KetQua = { ok: boolean; thongBao?: string }

// Lấy hội thoại kèm page, chỉ khi người đang đăng nhập được xem hội thoại đó
async function hoiThoaiCuaToi(id: string) {
  const phien = await batBuocDangNhap()
  const { data } = await db()
    .from('hoi_thoai')
    .select(`id, loai, khach_id, bai_viet_id, trang:trang_id (${COT_TRANG})`)
    .eq('id', id)
    .or(locHoiThoai(phien))
    .maybeSingle()
  if (!data) throw new Error('Không tìm thấy hội thoại')
  return {
    ...(data as unknown as { id: string; loai: 'tin_nhan' | 'binh_luan'; khach_id: string; bai_viet_id: string; trang: Trang }),
    toi: phien.nguoiDung.id,
  }
}

function loiDeHieu(e: unknown) {
  if (e instanceof LoiFacebook) {
    if (e.ma === 10 || /24/.test(e.message)) return 'Đã quá 24 giờ từ tin cuối của khách, Facebook không cho nhắn thêm.'
    return `Facebook báo lỗi: ${e.message}`
  }
  return e instanceof Error ? e.message : 'Có lỗi xảy ra'
}

export async function traLoi(_truoc: KetQua | null, form: FormData): Promise<KetQua> {
  const noiDung = String(form.get('noi_dung') ?? '').trim()
  const cach = String(form.get('cach') ?? 'cong_khai') // cong_khai | rieng (chỉ với bình luận)
  if (!noiDung) return { ok: false, thongBao: 'Chưa nhập nội dung' }
  try {
    await guiChoKhach(await hoiThoaiCuaToi(String(form.get('hoi_thoai_id'))), noiDung, cach)
    revalidatePath('/quan-ly')
    return { ok: true }
  } catch (e) {
    return { ok: false, thongBao: loiDeHieu(e) }
  }
}

// Gửi tin cho khách: nhắn Messenger, hoặc trả lời bình luận (công khai / nhắn riêng)
async function guiChoKhach(ht: Awaited<ReturnType<typeof hoiThoaiCuaToi>>, noiDung: string, cach: string) {
  const token = ht.trang.access_token
  if (ht.loai === 'tin_nhan') {
    const r = await guiTinNhan(token, ht.khach_id, noiDung)
    await luuTin({ trang: ht.trang, loai: 'tin_nhan', khachId: ht.khach_id, fbId: r.message_id, chieu: 'ra', noiDung, nguoiGuiId: ht.toi })
    return
  }
  // Trả lời vào bình luận mới nhất của khách trong bài này
  const { data: goc } = await db()
    .from('tin')
    .select('fb_id')
    .eq('hoi_thoai_id', ht.id)
    .eq('chieu', 'vao')
    .order('tao_luc', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!goc?.fb_id) throw new Error('Không có bình luận để trả lời')
  if (cach === 'rieng') {
    // Id người bình luận khác PSID Messenger, nên ghi lại ngay trong hội thoại bình luận
    const r = await nhanRiengBinhLuan(token, goc.fb_id, noiDung)
    await luuTin({ trang: ht.trang, loai: 'binh_luan', khachId: ht.khach_id, baiVietId: ht.bai_viet_id, fbId: r.message_id, chieu: 'ra', noiDung: `[Nhắn riêng] ${noiDung}`, nguoiGuiId: ht.toi })
  } else {
    const r = await traLoiBinhLuan(token, goc.fb_id, noiDung)
    await luuTin({ trang: ht.trang, loai: 'binh_luan', khachId: ht.khach_id, baiVietId: ht.bai_viet_id, fbId: r.id, chieu: 'ra', noiDung, nguoiGuiId: ht.toi })
  }
}

// Gửi tin xác nhận đơn cho khách. Khách bình luận thì nhắn riêng (không lộ địa chỉ, SĐT dưới bài viết).
export async function guiXacNhanDon(donId: string): Promise<KetQua> {
  try {
    const phien = await batBuocDangNhap()
    const { data: don } = await db().from('don_hang').select(COT_DON).eq('id', donId).or(locDonHang(phien)).maybeSingle<DonHang>()
    if (!don?.hoi_thoai_id) return { ok: false, thongBao: 'Đơn không gắn với hội thoại nào' }
    await guiChoKhach(await hoiThoaiCuaToi(don.hoi_thoai_id), noiDungXacNhan(don), 'rieng')
    if (don.trang_thai === 'moi') await db().from('don_hang').update({ trang_thai: 'xac_nhan', cap_nhat_luc: new Date().toISOString() }).eq('id', donId)
    revalidatePath('/quan-ly')
    revalidatePath('/quan-ly/don-hang')
    return { ok: true }
  } catch (e) {
    return { ok: false, thongBao: loiDeHieu(e) }
  }
}

export async function anHienBinhLuan(tinId: string, an: boolean): Promise<KetQua> {
  try {
    const { data: tin } = await db().from('tin').select('fb_id, hoi_thoai_id').eq('id', tinId).maybeSingle()
    if (!tin?.fb_id) throw new Error('Không tìm thấy bình luận')
    const ht = await hoiThoaiCuaToi(tin.hoi_thoai_id)
    await anBinhLuan(ht.trang.access_token, tin.fb_id, an)
    await db().from('tin').update({ da_an: an }).eq('id', tinId)
    revalidatePath('/quan-ly')
    return { ok: true }
  } catch (e) {
    return { ok: false, thongBao: loiDeHieu(e) }
  }
}

export async function datThe(hoiThoaiId: string, the: string[]) {
  await hoiThoaiCuaToi(hoiThoaiId)
  await db().from('hoi_thoai').update({ the }).eq('id', hoiThoaiId)
  revalidatePath('/quan-ly')
}

export async function luuSoDienThoai(hoiThoaiId: string, sdt: string) {
  await hoiThoaiCuaToi(hoiThoaiId)
  await db().from('hoi_thoai').update({ so_dien_thoai: sdt.replace(/[^\d+]/g, '') || null }).eq('id', hoiThoaiId)
  revalidatePath('/quan-ly')
}

export async function danhDauChuaDoc(hoiThoaiId: string) {
  await hoiThoaiCuaToi(hoiThoaiId)
  await db().from('hoi_thoai').update({ chua_doc: 1 }).eq('id', hoiThoaiId)
  revalidatePath('/quan-ly')
}

// ---- Cài đặt page ----
// Cài đặt page, kịch bản tự động, nhân viên: chỉ chủ page (không phải nhân viên được mời)
async function kiemTraTrang(trangId: string) {
  const { trangChu } = await batBuocDangNhap()
  if (!trangChu.includes(trangId)) throw new Error('Chỉ chủ Page mới thay đổi được cài đặt này')
}

export async function caiDatTrang(trangId: string, truong: 'an_binh_luan_sdt' | 'an_tat_ca_binh_luan', bat: boolean) {
  await kiemTraTrang(trangId)
  await db().from('fb_trang').update({ [truong]: bat }).eq('id', trangId)
  revalidatePath('/quan-ly/fanpage')
}

// Bật/tắt quản lý một page. Bật thì kiểm tra giới hạn số page của gói.
export async function batTatQuanLyTrang(trangId: string, bat: boolean): Promise<KetQua> {
  const { nguoiDung, goi, trangChu } = await batBuocDangNhap()
  if (bat && !trangChu.includes(trangId) && trangChu.length >= goi.soTrang) {
    return { ok: false, thongBao: `Gói ${goi.ten} quản lý tối đa ${goi.soTrang} Page. Tắt bớt Page khác hoặc nâng cấp gói.` }
  }
  await db().from('trang_quan_tri').update({ bat }).match({ nguoi_dung_id: nguoiDung.id, trang_id: trangId })
  revalidatePath('/quan-ly', 'layout')
  return { ok: true }
}

// ---- Quản trị (chủ phần mềm) ----
export async function capNhatKhach(form: FormData) {
  await batBuocQuanTri()
  const id = String(form.get('id'))
  const ngay = String(form.get('het_han') ?? '')
  await db()
    .from('nguoi_dung')
    .update({
      goi: timGoi(String(form.get('goi'))).ma,
      het_han: ngay ? new Date(`${ngay}T23:59:59+07:00`).toISOString() : null,
      bi_khoa: form.get('bi_khoa') === 'on',
      ghi_chu: String(form.get('ghi_chu') ?? '').trim() || null,
    })
    .eq('id', id)
  revalidatePath('/quan-ly/quan-tri')
}

export async function goTrang(trangId: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('trang_quan_tri').delete().match({ nguoi_dung_id: nguoiDung.id, trang_id: trangId })
  revalidatePath('/quan-ly', 'layout')
}

// ---- Tự động trả lời ----
// Thêm (một Page hoặc mọi Page) hoặc sửa kịch bản. tuKhoa rỗng = trả lời mọi tin / bình luận.
export async function luuTuDong(d: {
  id?: string
  trangId: string // 'tat_ca' = thêm cho mọi Page mình là chủ
  tuKhoa: string[]
  apDung: ApDung
  traLoi: string
  nhanRieng: string
}): Promise<KetQua> {
  try {
    const { trangChu } = await batBuocDangNhap()
    const apDung: ApDung = d.apDung in AP_DUNG ? d.apDung : 'ca_hai'
    const tuKhoa = [...new Set(d.tuKhoa.map((s) => s.trim()).filter(Boolean))].slice(0, 50)
    const traLoi = d.traLoi.trim().slice(0, 2000)
    // Nhắn riêng chỉ dùng cho bình luận
    const nhanRieng = apDung === 'tin_nhan' ? '' : d.nhanRieng.trim().slice(0, 2000)
    if (apDung !== 'binh_luan' && !traLoi) return { ok: false, thongBao: 'Chưa nhập nội dung trả lời' }
    if (!traLoi && !nhanRieng) return { ok: false, thongBao: 'Nhập nội dung trả lời công khai hoặc nhắn riêng' }
    // Mẫu soạn sẵn có chỗ [điền …]: không để lọt sang khách
    if (/\[[^\]]*\]/.test(traLoi + nhanRieng)) return { ok: false, thongBao: 'Nội dung còn chỗ [ ] chưa điền, hãy thay bằng thông tin của shop' }
    const giaTri = { tu_khoa: tuKhoa, ap_dung: apDung, tra_loi: traLoi, nhan_rieng: nhanRieng }

    if (d.id) {
      await tuDongCuaToi(d.id)
      const { error } = await db().from('tu_dong').update(giaTri).eq('id', d.id)
      if (error) return { ok: false, thongBao: loiCot(error.message) }
    } else {
      const trangIds = d.trangId === 'tat_ca' ? trangChu : trangChu.filter((t) => t === d.trangId)
      if (!trangIds.length) return { ok: false, thongBao: 'Chỉ chủ Page mới thêm được kịch bản' }
      const { error } = await db().from('tu_dong').insert(trangIds.map((trang_id) => ({ ...giaTri, trang_id })))
      if (error) return { ok: false, thongBao: loiCot(error.message) }
    }
    revalidatePath('/quan-ly/tu-dong')
    return { ok: true }
  } catch (e) {
    return { ok: false, thongBao: e instanceof Error ? e.message : 'Có lỗi xảy ra' }
  }
}

// Chưa chạy phần "Tự động trả lời nâng cao" trong supabase/schema.sql
const loiCot = (s: string) => (/nhan_rieng|tao_luc/.test(s) ? 'Cơ sở dữ liệu chưa cập nhật: hãy chạy lại file supabase/schema.sql trong Supabase.' : s)

async function tuDongCuaToi(id: string) {
  const { data } = await db().from('tu_dong').select('trang_id').eq('id', id).maybeSingle()
  if (!data) throw new Error('Không tìm thấy kịch bản')
  await kiemTraTrang(data.trang_id)
}

export async function batTatTuDong(id: string, bat: boolean) {
  await tuDongCuaToi(id)
  await db().from('tu_dong').update({ bat }).eq('id', id)
  revalidatePath('/quan-ly/tu-dong')
}

export async function xoaTuDong(id: string) {
  await tuDongCuaToi(id)
  await db().from('tu_dong').delete().eq('id', id)
  revalidatePath('/quan-ly/tu-dong')
}

// ---- Trợ lý AI (Gemini) ----
type CaiDatAiForm = { trangId: string; bat: boolean; apDung: ApDung; thongTin: string; cachNoi: string; nghiGio: number; toanQuyen: boolean }

export async function luuTroLyAi(d: CaiDatAiForm): Promise<KetQua> {
  try {
    await kiemTraTrang(d.trangId)
    if (d.bat && !coKhoaGemini()) return { ok: false, thongBao: 'Máy chủ chưa cài GEMINI_API_KEY nên chưa bật được AI' }
    if (d.bat && d.thongTin.trim().length < 20) return { ok: false, thongBao: 'Hãy nhập thông tin shop (sản phẩm, giá, ship…) để AI trả lời đúng' }
    const { error } = await db()
      .from('tro_ly_ai')
      .upsert({
        trang_id: d.trangId,
        bat: d.bat,
        ap_dung: d.apDung in AP_DUNG ? d.apDung : 'tin_nhan',
        thong_tin: d.thongTin.trim().slice(0, 20000),
        cach_noi: d.cachNoi.trim().slice(0, 2000),
        nghi_gio: Math.min(48, Math.max(0, Math.round(d.nghiGio) || 0)),
        toan_quyen: d.toanQuyen,
        cap_nhat_luc: new Date().toISOString(),
      })
    if (error) return { ok: false, thongBao: /tro_ly_ai|toan_quyen/.test(error.message) ? 'Cơ sở dữ liệu chưa cập nhật: hãy chạy lại file supabase/schema.sql trong Supabase.' : error.message }
    revalidatePath('/quan-ly/tu-dong')
    return { ok: true }
  } catch (e) {
    return { ok: false, thongBao: e instanceof Error ? e.message : 'Có lỗi xảy ra' }
  }
}

// Thử hỏi AI với nội dung đang soạn (chưa cần lưu). Không gửi gì cho khách.
export async function thuTroLyAi(d: { trangId: string; thongTin: string; cachNoi: string; loai: 'tin_nhan' | 'binh_luan'; cauHoi: string; toanQuyen: boolean }) {
  try {
    await kiemTraTrang(d.trangId)
    if (!coKhoaGemini()) return { ok: false as const, thongBao: 'Máy chủ chưa cài GEMINI_API_KEY' }
    const [{ data: t }, { data: kb }] = await Promise.all([
      db().from('fb_trang').select('ten').eq('id', d.trangId).single(),
      db().from('tu_dong').select('*').eq('trang_id', d.trangId).eq('bat', true),
    ])
    // Chế độ trả lời mọi tình huống: kịch bản từ khóa thành câu mẫu cho AI (giống khi chạy thật)
    const mau = d.toanQuyen
      ? ((kb ?? []) as { tu_khoa: string[]; tra_loi: string; nhan_rieng?: string }[]).filter((k) => k.tu_khoa.length).map((k) => ({ tuKhoa: k.tu_khoa, traLoi: k.tra_loi || k.nhan_rieng || '' }))
      : []
    const kq = await thuAi({ thong_tin: d.thongTin, cach_noi: d.cachNoi, tenTrang: t?.ten ?? 'Shop', loai: d.loai, toanQuyen: d.toanQuyen, mau }, [{ vai: 'khach', noiDung: d.cauHoi.slice(0, 1000) }])
    return { ok: true as const, ...kq }
  } catch (e) {
    return { ok: false as const, thongBao: e instanceof Error ? e.message : 'Có lỗi xảy ra' }
  }
}

// Bật / tạm dừng AI với riêng một hội thoại. Bật lại thì bỏ thẻ "Cần tư vấn".
export async function datAiHoiThoai(hoiThoaiId: string, bat: boolean) {
  await hoiThoaiCuaToi(hoiThoaiId)
  const { data: ht } = await db().from('hoi_thoai').select('the').eq('id', hoiThoaiId).single()
  await db()
    .from('hoi_thoai')
    .update(
      bat
        ? { ai_tam_dung_den: null, the: ((ht?.the as string[]) ?? []).filter((t) => t !== THE_CAN_NGUOI) }
        : { ai_tam_dung_den: new Date(Date.now() + 100 * 365 * 86400_000).toISOString() },
    )
    .eq('id', hoiThoaiId)
  revalidatePath('/quan-ly')
}

// ---- Mẫu câu & thẻ (theo người dùng) ----
export async function themMauCau(form: FormData) {
  const { nguoiDung } = await batBuocDangNhap()
  const phimTat = String(form.get('phim_tat') ?? '').trim().replace(/^\//, '').replace(/\s+/g, '_')
  const noiDung = String(form.get('noi_dung') ?? '').trim()
  if (!phimTat || !noiDung) return
  await db().from('mau_cau').insert({ nguoi_dung_id: nguoiDung.id, phim_tat: phimTat, noi_dung: noiDung })
  revalidatePath('/quan-ly', 'layout')
}

export async function xoaMauCau(id: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('mau_cau').delete().match({ id, nguoi_dung_id: nguoiDung.id })
  revalidatePath('/quan-ly', 'layout')
}

export async function themThe(form: FormData) {
  const { nguoiDung } = await batBuocDangNhap()
  const ten = String(form.get('ten') ?? '').trim()
  if (!ten) return
  await db()
    .from('the_hoi_thoai')
    .upsert({ nguoi_dung_id: nguoiDung.id, ten, mau: String(form.get('mau') ?? '#2563eb') }, { onConflict: 'nguoi_dung_id,ten' })
  revalidatePath('/quan-ly', 'layout')
}

export async function xoaThe(id: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('the_hoi_thoai').delete().match({ id, nguoi_dung_id: nguoiDung.id })
  revalidatePath('/quan-ly', 'layout')
}

// ---- Chia hội thoại ----
export async function giaoHoiThoai(hoiThoaiId: string, nguoiDungId: string | null) {
  const ht = await hoiThoaiCuaToi(hoiThoaiId)
  if (nguoiDungId) {
    // Chỉ giao cho người đang quản lý page của hội thoại
    const { data } = await db().from('trang_quan_tri').select('nguoi_dung_id').match({ trang_id: ht.trang.id, nguoi_dung_id: nguoiDungId }).maybeSingle()
    if (!data) throw new Error('Người này không quản lý Page của hội thoại')
  }
  await db().from('hoi_thoai').update({ nguoi_phu_trach: nguoiDungId }).eq('id', hoiThoaiId)
  revalidatePath('/quan-ly')
}

export async function doiCheDoChia(trangId: string, xoayVong: boolean) {
  await kiemTraTrang(trangId)
  await db().from('fb_trang').update({ che_do_chia: xoayVong ? 'xoay_vong' : 'thu_cong' }).eq('id', trangId)
  revalidatePath('/quan-ly/nhan-vien')
}

// ---- Nhân viên ----
async function soNhanVienCuaChu(chuId: string) {
  const { data } = await db().from('trang_quan_tri').select('nguoi_dung_id').eq('moi_boi', chuId).eq('vai_tro', 'nhan_vien')
  return new Set((data ?? []).map((r) => r.nguoi_dung_id)).size
}

export async function taoLoiMoi(_truoc: KetQua | null, form: FormData): Promise<KetQua & { ma?: string }> {
  const { nguoiDung, goi, trangChu } = await batBuocDangNhap()
  const trang = form.getAll('trang_id').map(String).filter((t) => trangChu.includes(t))
  if (!trang.length) return { ok: false, thongBao: 'Chọn ít nhất một Page cho nhân viên' }
  if ((await soNhanVienCuaChu(nguoiDung.id)) >= goi.soNhanVien) {
    return { ok: false, thongBao: `Gói ${goi.ten} có tối đa ${goi.soNhanVien} nhân viên. Xóa bớt hoặc nâng cấp gói.` }
  }
  const ma = randomBytes(12).toString('base64url')
  const { error } = await db()
    .from('loi_moi')
    .insert({
      ma,
      chu_id: nguoiDung.id,
      trang_ids: trang,
      chi_xem_cua_minh: form.get('chi_xem_cua_minh') === 'on',
      het_han: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    })
  if (error) return { ok: false, thongBao: error.message }
  revalidatePath('/quan-ly/nhan-vien')
  return { ok: true, ma }
}

export async function xoaLoiMoi(ma: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('loi_moi').delete().match({ ma, chu_id: nguoiDung.id })
  revalidatePath('/quan-ly/nhan-vien')
}

export async function nhanLoiMoi(ma: string): Promise<KetQua> {
  const { nguoiDung } = await batBuocDangNhap()
  const { data: lm } = await db().from('loi_moi').select('*').eq('ma', ma).maybeSingle()
  if (!lm || lm.da_dung_boi || new Date(lm.het_han).getTime() < Date.now()) return { ok: false, thongBao: 'Lời mời không còn hiệu lực' }
  if (lm.chu_id === nguoiDung.id) return { ok: false, thongBao: 'Đây là lời mời do chính bạn tạo' }
  const { data: chu } = await db().from('nguoi_dung').select('goi, het_han').eq('id', lm.chu_id).single()
  if ((await soNhanVienCuaChu(lm.chu_id)) >= goiHieuLuc(chu!).goi.soNhanVien) {
    return { ok: false, thongBao: 'Chủ shop đã đủ số nhân viên theo gói' }
  }
  // Đã là chủ page đó trên Facebook thì giữ nguyên quyền chủ
  await db()
    .from('trang_quan_tri')
    .upsert(
      (lm.trang_ids as string[]).map((t) => ({
        nguoi_dung_id: nguoiDung.id,
        trang_id: t,
        vai_tro: 'nhan_vien',
        moi_boi: lm.chu_id,
        chi_xem_cua_minh: lm.chi_xem_cua_minh,
        bat: true,
      })),
      { onConflict: 'nguoi_dung_id,trang_id', ignoreDuplicates: true },
    )
  await db().from('loi_moi').update({ da_dung_boi: nguoiDung.id }).eq('ma', ma)
  revalidatePath('/quan-ly', 'layout')
  return { ok: true }
}

// Chủ chỉnh nhân viên trên một page của mình
export async function capNhatNhanVien(nhanVienId: string, trangId: string, truong: 'nhan_chia' | 'chi_xem_cua_minh', bat: boolean) {
  await kiemTraTrang(trangId)
  await db().from('trang_quan_tri').update({ [truong]: bat }).match({ nguoi_dung_id: nhanVienId, trang_id: trangId })
  revalidatePath('/quan-ly/nhan-vien')
}

export async function xoaNhanVien(nhanVienId: string) {
  const { trangChu } = await batBuocDangNhap()
  await db().from('trang_quan_tri').delete().eq('nguoi_dung_id', nhanVienId).eq('vai_tro', 'nhan_vien').in('trang_id', trangChu)
  // Bỏ phụ trách các hội thoại trên page của mình
  await db().from('hoi_thoai').update({ nguoi_phu_trach: null }).eq('nguoi_phu_trach', nhanVienId).in('trang_id', trangChu)
  revalidatePath('/quan-ly/nhan-vien')
}
