'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { LoiFacebook, anBinhLuan, guiTinNhan, nhanRiengBinhLuan, traLoiBinhLuan } from '@/lib/facebook'
import { luuTin, type Trang } from '@/lib/hopThu'
import { batBuocDangNhap } from '@/lib/phien'

export type KetQua = { ok: boolean; thongBao?: string }

const COT_TRANG = 'id, ten, access_token, an_binh_luan_sdt, an_tat_ca_binh_luan'

// Lấy hội thoại kèm page, chỉ khi người đang đăng nhập quản lý page đó
async function hoiThoaiCuaToi(id: string) {
  const { trangIds } = await batBuocDangNhap()
  const { data } = await db()
    .from('hoi_thoai')
    .select(`id, loai, khach_id, bai_viet_id, trang:trang_id (${COT_TRANG})`)
    .eq('id', id)
    .in('trang_id', trangIds)
    .maybeSingle()
  if (!data) throw new Error('Không tìm thấy hội thoại')
  return data as unknown as { id: string; loai: 'tin_nhan' | 'binh_luan'; khach_id: string; bai_viet_id: string; trang: Trang }
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
    const ht = await hoiThoaiCuaToi(String(form.get('hoi_thoai_id')))
    const token = ht.trang.access_token
    if (ht.loai === 'tin_nhan') {
      const r = await guiTinNhan(token, ht.khach_id, noiDung)
      await luuTin({ trang: ht.trang, loai: 'tin_nhan', khachId: ht.khach_id, fbId: r.message_id, chieu: 'ra', noiDung })
    } else {
      // Trả lời vào bình luận mới nhất của khách trong bài này
      const { data: goc } = await db()
        .from('tin')
        .select('fb_id')
        .eq('hoi_thoai_id', ht.id)
        .eq('chieu', 'vao')
        .order('tao_luc', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!goc?.fb_id) return { ok: false, thongBao: 'Không có bình luận để trả lời' }
      if (cach === 'rieng') {
        // Id người bình luận khác PSID Messenger, nên ghi lại ngay trong hội thoại bình luận
        const r = await nhanRiengBinhLuan(token, goc.fb_id, noiDung)
        await luuTin({ trang: ht.trang, loai: 'binh_luan', khachId: ht.khach_id, baiVietId: ht.bai_viet_id, fbId: r.message_id, chieu: 'ra', noiDung: `[Nhắn riêng] ${noiDung}` })
      } else {
        const r = await traLoiBinhLuan(token, goc.fb_id, noiDung)
        await luuTin({ trang: ht.trang, loai: 'binh_luan', khachId: ht.khach_id, baiVietId: ht.bai_viet_id, fbId: r.id, chieu: 'ra', noiDung })
      }
    }
    revalidatePath('/quan-ly')
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
async function kiemTraTrang(trangId: string) {
  const { trangIds } = await batBuocDangNhap()
  if (!trangIds.includes(trangId)) throw new Error('Bạn không quản lý page này')
}

export async function caiDatTrang(trangId: string, truong: 'an_binh_luan_sdt' | 'an_tat_ca_binh_luan', bat: boolean) {
  await kiemTraTrang(trangId)
  await db().from('fb_trang').update({ [truong]: bat }).eq('id', trangId)
  revalidatePath('/quan-ly/fanpage')
}

export async function goTrang(trangId: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('trang_quan_tri').delete().match({ nguoi_dung_id: nguoiDung.id, trang_id: trangId })
  revalidatePath('/quan-ly', 'layout')
}

// ---- Tự động trả lời ----
export async function themTuDong(form: FormData) {
  const trangId = String(form.get('trang_id'))
  await kiemTraTrang(trangId)
  const tuKhoa = String(form.get('tu_khoa') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const traLoi = String(form.get('tra_loi') ?? '').trim()
  if (!tuKhoa.length || !traLoi) return
  await db()
    .from('tu_dong')
    .insert({ trang_id: trangId, tu_khoa: tuKhoa, tra_loi: traLoi, ap_dung: String(form.get('ap_dung') ?? 'ca_hai') })
  revalidatePath('/quan-ly/tu-dong')
}

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
