'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { DS_TRANG_THAI, tongDon, type TrangThaiDon } from '@/lib/donHang'
import { batBuocDangNhap, locDonHang, locHoiThoai } from '@/lib/phien'

export type KetQua = { ok: boolean; thongBao?: string; id?: string }

const Don = z.object({
  id: z.uuid().optional(),
  hoi_thoai_id: z.uuid(),
  khach_ten: z.string().trim().max(200),
  so_dien_thoai: z.string().trim().max(30).transform((s) => s.replace(/[^\d+]/g, '')),
  dia_chi: z.string().trim().max(500),
  san_pham: z
    .array(z.object({ ten: z.string().trim().min(1).max(200), sl: z.number().int().min(1).max(100000), gia: z.number().int().min(0).max(1e10) }))
    .min(1, 'Chưa có sản phẩm nào'),
  phi_ship: z.number().int().min(0).max(1e9),
  giam_gia: z.number().int().min(0).max(1e10),
  ghi_chu: z.string().trim().max(1000),
})

const lamMoi = () => {
  revalidatePath('/quan-ly')
  revalidatePath('/quan-ly/don-hang')
}

// Lưu đơn (tạo mới hoặc sửa). Đơn luôn gắn với một hội thoại mình được xem.
export async function luuDon(duLieu: z.input<typeof Don>): Promise<KetQua> {
  const phien = await batBuocDangNhap()
  const kt = Don.safeParse(duLieu)
  if (!kt.success) return { ok: false, thongBao: kt.error.issues[0]?.message ?? 'Thông tin đơn chưa hợp lệ' }
  const { id, ...d } = kt.data

  const { data: ht } = await db()
    .from('hoi_thoai')
    .select('id, trang_id, so_dien_thoai')
    .eq('id', d.hoi_thoai_id)
    .or(locHoiThoai(phien))
    .maybeSingle()
  if (!ht) return { ok: false, thongBao: 'Không tìm thấy hội thoại' }

  const giaTri = { ...d, tong: tongDon(d), cap_nhat_luc: new Date().toISOString() }
  let donId = id
  if (id) {
    const { data, error } = await db().from('don_hang').update(giaTri).eq('id', id).or(locDonHang(phien)).select('id').maybeSingle()
    if (error) return { ok: false, thongBao: error.message }
    if (!data) return { ok: false, thongBao: 'Không tìm thấy đơn' }
  } else {
    const { data, error } = await db()
      .from('don_hang')
      .insert({ ...giaTri, trang_id: ht.trang_id, nguoi_tao_id: phien.nguoiDung.id })
      .select('id')
      .single()
    if (error) return { ok: false, thongBao: error.message }
    donId = data.id
  }
  // Hội thoại chưa có SĐT: lấy luôn số trong đơn
  if (!ht.so_dien_thoai && d.so_dien_thoai) await db().from('hoi_thoai').update({ so_dien_thoai: d.so_dien_thoai }).eq('id', ht.id)
  lamMoi()
  return { ok: true, id: donId }
}

export async function doiTrangThaiDon(id: string, trangThai: TrangThaiDon) {
  const phien = await batBuocDangNhap()
  if (!DS_TRANG_THAI.includes(trangThai)) return
  await db().from('don_hang').update({ trang_thai: trangThai, cap_nhat_luc: new Date().toISOString() }).eq('id', id).or(locDonHang(phien))
  lamMoi()
}

export async function xoaDon(id: string) {
  const phien = await batBuocDangNhap()
  await db().from('don_hang').delete().eq('id', id).or(locDonHang(phien))
  lamMoi()
}
