'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { guiTelegram, thoat } from '@/lib/telegram'
import { GOI } from '@/lib/thongTin'

export type KetQua = { ok: boolean; thongBao: string; loi?: Record<string, string> }

const mau = z.object({
  ho_ten: z.string().trim().min(2, 'Vui lòng nhập họ tên').max(100),
  so_dien_thoai: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s.-]/g, ''))
    .pipe(z.string().regex(/^(\+?84|0)\d{9}$/, 'Số điện thoại chưa đúng (10 số, ví dụ 0912345678)')),
  ten_doanh_nghiep: z.string().trim().max(150).optional(),
  linh_vuc: z.string().trim().max(100).optional(),
  goi_quan_tam: z.string().trim().max(50).optional(),
  loi_nhan: z.string().trim().max(1000).optional(),
})

export async function dangKyTuVan(_truoc: KetQua | null, form: FormData): Promise<KetQua> {
  // Ô ẩn chống máy gửi rác: người thật không thấy nên để trống
  if (form.get('website')) return { ok: true, thongBao: 'Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.' }

  const kq = mau.safeParse({
    ho_ten: form.get('ho_ten') ?? '',
    so_dien_thoai: form.get('so_dien_thoai') ?? '',
    ten_doanh_nghiep: form.get('ten_doanh_nghiep') || undefined,
    linh_vuc: form.get('linh_vuc') || undefined,
    goi_quan_tam: form.get('goi_quan_tam') || undefined,
    loi_nhan: form.get('loi_nhan') || undefined,
  })
  if (!kq.success) {
    const loi: Record<string, string> = {}
    for (const v of kq.error.issues) loi[String(v.path[0])] ??= v.message
    return { ok: false, thongBao: 'Vui lòng kiểm tra lại thông tin.', loi }
  }
  const d = kq.data

  let { error } = await db().from('khach_dang_ky').insert(d)
  // Chưa tạo bảng khach_dang_ky (PGRST205): tạm lưu vào bảng cai_dat có sẵn, khóa "khach_<thời gian>"
  if (error?.code === 'PGRST205') {
    const khoa = `khach_${new Date().toISOString()}_${Math.random().toString(36).slice(2, 6)}`
    ;({ error } = await db().from('cai_dat').insert({ khoa, gia_tri: { ...d, trang_thai: 'moi' } }))
  }
  if (error) {
    console.error('Lưu đăng ký lỗi:', error.message)
    return { ok: false, thongBao: 'Hệ thống đang bận, bạn vui lòng nhắn Zalo hoặc thử lại sau ít phút.' }
  }

  const tenGoi = GOI.find((g) => g.ma === d.goi_quan_tam)?.ten ?? 'Chưa chọn'
  await guiTelegram(
    `🆕 <b>Khách đăng ký tư vấn</b>\n` +
      `👤 ${thoat(d.ho_ten)} — ${thoat(d.so_dien_thoai)}\n` +
      (d.ten_doanh_nghiep ? `🏢 ${thoat(d.ten_doanh_nghiep)}${d.linh_vuc ? ` (${thoat(d.linh_vuc)})` : ''}\n` : '') +
      `📦 ${thoat(tenGoi)}\n` +
      (d.loi_nhan ? `💬 ${thoat(d.loi_nhan)}` : ''),
  )
  return { ok: true, thongBao: 'Cảm ơn bạn! Chúng tôi sẽ gọi lại trong giờ làm việc.' }
}
