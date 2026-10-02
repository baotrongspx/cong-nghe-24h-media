'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { LoiFacebook, dangBaiTrang, taiAnhLenTrang, xoaBaiTrang } from '@/lib/facebook'
import { batBuocDangNhap } from '@/lib/phien'

const KHO_ANH = 'anh-bai-viet'
const LOAI_ANH: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

export type KetQua = { ok: boolean; thongBao?: string }

// Link tải ảnh thẳng từ trình duyệt lên Supabase Storage (không qua máy chủ, tránh giới hạn dung lượng)
export async function layLinkTaiAnh(loai: string): Promise<{ ok: true; linkTai: string; linkAnh: string } | { ok: false; thongBao: string }> {
  const { nguoiDung } = await batBuocDangNhap()
  const duoi = LOAI_ANH[loai]
  if (!duoi) return { ok: false, thongBao: 'Chỉ nhận ảnh JPG, PNG, WEBP, GIF' }
  const kho = db().storage
  // Lần đầu dùng: tạo kho ảnh công khai (Facebook cần tải ảnh qua URL công khai)
  const { error: loiKho } = await kho.getBucket(KHO_ANH)
  if (loiKho) await kho.createBucket(KHO_ANH, { public: true, fileSizeLimit: 8 * 1024 * 1024, allowedMimeTypes: Object.keys(LOAI_ANH) })
  const duong = `${nguoiDung.id}/${randomUUID()}.${duoi}`
  const { data, error } = await kho.from(KHO_ANH).createSignedUploadUrl(duong)
  if (error || !data) return { ok: false, thongBao: error?.message ?? 'Không tạo được link tải ảnh' }
  return { ok: true, linkTai: data.signedUrl, linkAnh: kho.from(KHO_ANH).getPublicUrl(duong).data.publicUrl }
}

// Giờ Việt Nam từ ô datetime-local ("2026-10-05T08:30")
const tuGioVN = (s: string) => new Date(`${s}:00+07:00`)

export async function taoBaiViet(_truoc: KetQua | null, form: FormData): Promise<KetQua> {
  const { nguoiDung, trangChu } = await batBuocDangNhap()
  const noiDung = String(form.get('noi_dung') ?? '').trim()
  const goc = `${process.env.SUPABASE_URL?.trim()}/storage/v1/object/public/${KHO_ANH}/${nguoiDung.id}/`
  const anh = form.getAll('anh').map(String).filter((u) => u.startsWith(goc)).slice(0, 10)
  const trang = form.getAll('trang_id').map(String).filter((t) => trangChu.includes(t))
  const bienThe = form.getAll('bien_the').map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
  const henChuoi = String(form.get('hen_luc') ?? '')
  const henLuc = form.get('che_do') === 'hen' && henChuoi ? tuGioVN(henChuoi) : undefined

  if (!noiDung && !anh.length) return { ok: false, thongBao: 'Bài viết cần nội dung hoặc ảnh' }
  if (henLuc) {
    const phut = (henLuc.getTime() - Date.now()) / 60_000
    if (phut < 11) return { ok: false, thongBao: 'Giờ hẹn phải sau thời điểm hiện tại ít nhất 11 phút' }
    if (phut > 29 * 24 * 60) return { ok: false, thongBao: 'Facebook chỉ cho hẹn giờ trong vòng 29 ngày' }
  }

  const { data: bai, error } = await db().from('bai_viet').insert({ nguoi_dung_id: nguoiDung.id, noi_dung: noiDung, anh, bien_the: bienThe }).select('id').single()
  if (error) return { ok: false, thongBao: error.message }

  // Đăng / hẹn giờ lên từng Fanpage đã chọn
  const { data: dsTrang } = trang.length ? await db().from('fb_trang').select('id, ten, access_token').in('id', trang) : { data: [] }
  const loi: string[] = []
  for (const t of dsTrang ?? []) {
    try {
      const anhIds: string[] = []
      for (const u of anh) anhIds.push(await taiAnhLenTrang(t.access_token, t.id, u, !!henLuc))
      const r = await dangBaiTrang(t.access_token, t.id, { noiDung, anhIds, henLuc })
      await db()
        .from('dang_trang')
        .insert({ bai_viet_id: bai.id, trang_id: t.id, hen_luc: henLuc?.toISOString() ?? null, fb_post_id: r.id, trang_thai: henLuc ? 'da_hen' : 'da_dang' })
    } catch (e) {
      const thongBao = e instanceof LoiFacebook ? e.message : String(e)
      loi.push(`${t.ten}: ${thongBao}`)
      await db().from('dang_trang').insert({ bai_viet_id: bai.id, trang_id: t.id, hen_luc: henLuc?.toISOString() ?? null, trang_thai: 'loi', loi: thongBao })
    }
  }
  revalidatePath('/quan-ly/dang-bai')
  if (loi.length) return { ok: false, thongBao: `Một số Page lỗi — ${loi.join('; ')}` }
  return {
    ok: true,
    thongBao: !trang.length ? 'Đã lưu bài vào thư viện.' : henLuc ? `Đã hẹn giờ đăng lên ${trang.length} Page.` : `Đã đăng lên ${trang.length} Page.`,
  }
}

export async function huyHenGio(dangTrangId: string) {
  const { trangChu } = await batBuocDangNhap()
  const { data: d } = await db().from('dang_trang').select('fb_post_id, trang_id, trang_thai').eq('id', dangTrangId).maybeSingle()
  if (!d || !trangChu.includes(d.trang_id) || d.trang_thai !== 'da_hen' || !d.fb_post_id) return
  const { data: t } = await db().from('fb_trang').select('access_token').eq('id', d.trang_id).single()
  await xoaBaiTrang(t!.access_token, d.fb_post_id).catch(() => {})
  await db().from('dang_trang').update({ trang_thai: 'da_huy' }).eq('id', dangTrangId)
  revalidatePath('/quan-ly/dang-bai')
}

export async function xoaBaiViet(id: string) {
  const { nguoiDung } = await batBuocDangNhap()
  // Chỉ xóa khỏi thư viện phần mềm; bài đã đăng trên Facebook giữ nguyên
  await db().from('bai_viet').delete().match({ id, nguoi_dung_id: nguoiDung.id })
  revalidatePath('/quan-ly/dang-bai')
  revalidatePath('/quan-ly/dang-nhom')
}

// ---- Trợ lý đăng nhóm (người dùng tự bấm đăng trên Facebook) ----
// Dán nhiều dòng, mỗi dòng một nhóm: "link" hoặc "Tên | link" hoặc "Tên<tab>link". Bỏ qua link trùng.
export async function themNhieuNhom(_truoc: KetQua | null, form: FormData): Promise<KetQua> {
  const { nguoiDung } = await batBuocDangNhap()
  const { data: daCo } = await db().from('nhom_fb').select('link').eq('nguoi_dung_id', nguoiDung.id)
  const khoa = (l: string) => l.replace(/^https:\/\/(www\.|m\.|web\.)?facebook\.com\/groups\//, '').replace(/[/?#].*$/, '').toLowerCase()
  const daCoKhoa = new Set((daCo ?? []).map((n) => khoa(n.link)))
  const moi: { nguoi_dung_id: string; ten: string; link: string }[] = []
  for (const dong of String(form.get('danh_sach') ?? '').split(/\r?\n/)) {
    const m = dong.match(/https:\/\/(?:www\.|m\.|web\.)?facebook\.com\/groups\/([\w.-]+)/)
    if (!m) continue
    const link = `https://www.facebook.com/groups/${m[1]}`
    const k = m[1].toLowerCase()
    if (daCoKhoa.has(k)) continue
    daCoKhoa.add(k)
    const ten = dong.slice(0, dong.indexOf('http')).replace(/[|\t,;:-]+\s*$/, '').trim() || (/^\d+$/.test(m[1]) ? `Nhóm ${m[1]}` : m[1].replace(/[.-]/g, ' '))
    moi.push({ nguoi_dung_id: nguoiDung.id, ten: ten.slice(0, 120), link })
  }
  if (!moi.length) {
    const coLink = /facebook\.com\/groups\//.test(String(form.get('danh_sach') ?? ''))
    return {
      ok: false,
      thongBao: coLink
        ? 'Các nhóm này đã có trong danh sách rồi.'
        : 'Ô này dùng để dán LINK nhóm (dạng https://www.facebook.com/groups/...), không phải để tìm. Thêm nhóm xong, ô tìm theo tên sẽ hiện ở danh sách bên phải.',
    }
  }
  const { error } = await db().from('nhom_fb').insert(moi)
  if (error) return { ok: false, thongBao: error.message }
  revalidatePath('/quan-ly/dang-nhom')
  return { ok: true, thongBao: `Đã thêm ${moi.length} nhóm.` }
}

export async function xoaNhom(id: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('nhom_fb').delete().match({ id, nguoi_dung_id: nguoiDung.id })
  revalidatePath('/quan-ly/dang-nhom')
}

export async function danhDauDaDangNhom(nhomId: string, baiVietId: string) {
  const { nguoiDung } = await batBuocDangNhap()
  const { data: n } = await db().from('nhom_fb').select('id').match({ id: nhomId, nguoi_dung_id: nguoiDung.id }).maybeSingle()
  const { data: b } = await db().from('bai_viet').select('id').match({ id: baiVietId, nguoi_dung_id: nguoiDung.id }).maybeSingle()
  if (!n || !b) return
  await db().from('dang_nhom').insert({ nhom_id: nhomId, bai_viet_id: baiVietId, nguoi_dung_id: nguoiDung.id })
  revalidatePath('/quan-ly/dang-nhom')
}

// Bỏ đánh dấu "đã đăng" một bài ở một nhóm (đánh dấu nhầm, hoặc muốn đăng lại)
export async function boDanhDauNhom(nhomId: string, baiVietId: string) {
  const { nguoiDung } = await batBuocDangNhap()
  await db().from('dang_nhom').delete().match({ nhom_id: nhomId, bai_viet_id: baiVietId, nguoi_dung_id: nguoiDung.id })
  revalidatePath('/quan-ly/dang-nhom')
}
