'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { GIONG, docThanhGiong } from '@/lib/giongNoi'
import { batBuocDangNhap } from '@/lib/phien'

export type KetQua = { ok: boolean; thongBao?: string; id?: string }

const Phien = z.object({
  id: z.uuid().optional(),
  ten: z.string().trim().min(1, 'Nhập tên shop / tên phiên live').max(100),
  tiktok: z.string().trim().max(60).transform((s) => s.replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '').split(/[/?]/)[0]),
  thongTin: z.string().trim().max(20000),
  cachNoi: z.string().trim().max(2000),
  loiMoDau: z.string().trim().max(1000),
  giong: z.string().refine((g) => GIONG.some(([ma]) => ma === g), 'Giọng đọc không hợp lệ'),
  sanPham: z
    .array(z.object({ ten: z.string().trim().min(1).max(200), gia: z.number().int().min(0).max(1e10), anh: z.string().trim().max(1000), mo_ta: z.string().trim().max(500) }))
    .max(50),
})

export async function luuPhienLive(duLieu: z.input<typeof Phien>): Promise<KetQua> {
  const { nguoiDung } = await batBuocDangNhap()
  const kt = Phien.safeParse(duLieu)
  if (!kt.success) return { ok: false, thongBao: kt.error.issues[0]?.message ?? 'Thông tin chưa hợp lệ' }
  const { id, thongTin, cachNoi, loiMoDau, sanPham, ...d } = kt.data
  // Ảnh sản phẩm chỉ nhận ảnh đã tải lên kho của chính mình (hoặc để trống)
  const goc = `${process.env.SUPABASE_URL?.trim()}/storage/v1/object/public/`
  const giaTri = {
    ...d,
    thong_tin: thongTin,
    cach_noi: cachNoi,
    loi_mo_dau: loiMoDau,
    san_pham: sanPham.map((x) => ({ ...x, anh: x.anh.startsWith(goc) ? x.anh : '' })),
    cap_nhat_luc: new Date().toISOString(),
  }
  const { data, error } = id
    ? await db().from('phien_live').update(giaTri).eq('id', id).eq('nguoi_dung_id', nguoiDung.id).select('id').maybeSingle()
    : await db()
        .from('phien_live')
        .insert({ ...giaTri, nguoi_dung_id: nguoiDung.id, ma: randomBytes(18).toString('base64url') })
        .select('id')
        .single()
  if (error) return { ok: false, thongBao: /phien_live/.test(error.message) ? 'Cơ sở dữ liệu chưa cập nhật: hãy chạy lại file supabase/schema.sql trong Supabase.' : error.message }
  if (!data) return { ok: false, thongBao: 'Không tìm thấy phiên live' }
  revalidatePath('/quan-ly/live')
  return { ok: true, id: data.id }
}

export async function xoaPhienLive(id: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('phien_live').delete().eq('id', id).eq('nguoi_dung_id', nguoiDung.id)
  revalidatePath('/quan-ly/live')
}

// Đổi link sân khấu (khi lỡ để lộ link)
export async function doiMaPhienLive(id: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('phien_live').update({ ma: randomBytes(18).toString('base64url') }).eq('id', id).eq('nguoi_dung_id', nguoiDung.id)
  revalidatePath('/quan-ly/live')
}

// Nghe thử giọng đọc trước khi chọn
export async function ngheThuGiong(giong: string): Promise<{ ok: true; amThanh: string } | { ok: false; thongBao: string }> {
  await batBuocDangNhap()
  if (!GIONG.some(([ma]) => ma === giong)) return { ok: false, thongBao: 'Giọng không hợp lệ' }
  try {
    return { ok: true, amThanh: await docThanhGiong('Chào cả nhà đã ghé live của shop! Hôm nay bên em có nhiều ưu đãi lắm, cả nhà thả tim ủng hộ em nha.', giong) }
  } catch (e) {
    return { ok: false, thongBao: e instanceof Error ? e.message : 'Lỗi' }
  }
}
