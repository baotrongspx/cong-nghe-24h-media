import 'server-only'
import { db } from '@/lib/db'
import { anBinhLuan, guiTinNhan, nhanRiengBinhLuan, tenKhach, timSoDienThoai, traLoiBinhLuan } from '@/lib/facebook'
import { GIO_CHO_TRA_LOI_MOI_TIN, chonKichBan, thayTen, type KichBan } from '@/lib/tuDong'

export type Trang = {
  id: string
  ten: string
  access_token: string
  an_binh_luan_sdt: boolean
  an_tat_ca_binh_luan: boolean
  che_do_chia?: string
}

export const COT_TRANG = 'id, ten, access_token, an_binh_luan_sdt, an_tat_ca_binh_luan, che_do_chia'

type TinMoi = {
  trang: Trang
  loai: 'tin_nhan' | 'binh_luan'
  khachId: string
  khachTen?: string | null
  baiVietId?: string
  fbId: string
  chieu: 'vao' | 'ra'
  noiDung: string | null
  dinhKem?: unknown
  thoiGian?: Date
  nguoiGuiId?: string // người trả lời trên phần mềm (nhân viên)
}

// Chia xoay vòng: chọn người nhận chia lâu nhất chưa được giao
async function chonNguoiXoayVong(trangId: string) {
  const { data } = await db()
    .from('trang_quan_tri')
    .select('nguoi_dung_id')
    .eq('trang_id', trangId)
    .eq('bat', true)
    .eq('nhan_chia', true)
    .order('chia_luc', { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  await db().from('trang_quan_tri').update({ chia_luc: new Date().toISOString() }).match({ trang_id: trangId, nguoi_dung_id: data.nguoi_dung_id })
  return data.nguoi_dung_id as string
}

// Lưu một tin (nhắn hoặc bình luận) vào hội thoại tương ứng. Trả về null nếu tin đã có (Facebook gửi lại webhook).
export async function luuTin(t: TinMoi) {
  const khoa = { trang_id: t.trang.id, loai: t.loai, khach_id: t.khachId, bai_viet_id: t.baiVietId ?? '' }
  const luc = (t.thoiGian ?? new Date()).toISOString()

  let { data: ht } = await db()
    .from('hoi_thoai')
    .select('id, khach_ten, so_dien_thoai, chua_doc, nguoi_phu_trach')
    .match(khoa)
    .maybeSingle()
  if (!ht) {
    const ten = t.khachTen ?? (t.loai === 'tin_nhan' ? await tenKhach(t.trang.access_token, t.khachId) : null)
    const phuTrach = t.chieu === 'vao' && t.trang.che_do_chia === 'xoay_vong' ? await chonNguoiXoayVong(t.trang.id) : null
    const r = await db()
      .from('hoi_thoai')
      .upsert({ ...khoa, khach_ten: ten, nguoi_phu_trach: phuTrach }, { onConflict: 'trang_id,loai,khach_id,bai_viet_id' })
      .select('id, khach_ten, so_dien_thoai, chua_doc, nguoi_phu_trach')
      .single()
    if (r.error) throw new Error(r.error.message)
    ht = r.data
  }

  const { data: tin, error } = await db()
    .from('tin')
    .upsert(
      { hoi_thoai_id: ht.id, fb_id: t.fbId, chieu: t.chieu, noi_dung: t.noiDung, dinh_kem: t.dinhKem ?? null, tao_luc: luc, nguoi_gui_id: t.nguoiGuiId ?? null },
      { onConflict: 'fb_id', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!tin) return null

  const sdt = t.chieu === 'vao' ? timSoDienThoai(t.noiDung) : null
  await db()
    .from('hoi_thoai')
    .update({
      tin_cuoi: (t.chieu === 'ra' ? 'Bạn: ' : '') + (t.noiDung || '[Tệp đính kèm]'),
      cap_nhat_luc: luc,
      chua_doc: t.chieu === 'vao' ? ht.chua_doc + 1 : 0,
      ...(t.khachTen && !ht.khach_ten ? { khach_ten: t.khachTen } : {}),
      ...(sdt ? { so_dien_thoai: sdt } : {}),
      // Hội thoại chưa ai phụ trách: giao cho người trả lời đầu tiên
      ...(t.nguoiGuiId && !ht.nguoi_phu_trach ? { nguoi_phu_trach: t.nguoiGuiId } : {}),
    })
    .eq('id', ht.id)

  return { hoiThoaiId: ht.id as string, tinId: tin.id as string, sdt }
}

// Tìm kịch bản tự trả lời: khớp từ khóa trước, không khớp thì kịch bản "mọi tin" (nếu 24 giờ qua shop chưa nhắn gì cho khách)
async function timTraLoiTuDong(p: { trangId: string; loai: 'tin_nhan' | 'binh_luan'; noiDung: string | null; hoiThoaiId: string; khachTen?: string | null }) {
  // select('*'): vẫn chạy khi chưa thêm cột mới (nhan_rieng, tao_luc) vào cơ sở dữ liệu
  const { data } = await db().from('tu_dong').select('*').eq('trang_id', p.trangId).eq('bat', true).in('ap_dung', [p.loai, 'ca_hai'])
  const ds = ((data ?? []) as KichBan[]).sort((a, b) => (a.tao_luc ?? '').localeCompare(b.tao_luc ?? ''))
  const chon = chonKichBan(ds, p.loai, p.noiDung)
  if (!chon) return null
  if (chon.moiTin) {
    const tu = new Date(Date.now() - GIO_CHO_TRA_LOI_MOI_TIN * 3600_000).toISOString()
    const { count } = await db().from('tin').select('id', { count: 'exact', head: true }).eq('hoi_thoai_id', p.hoiThoaiId).eq('chieu', 'ra').gte('tao_luc', tu)
    if (count) return null
  }
  let ten = p.khachTen
  if (!ten) ten = (await db().from('hoi_thoai').select('khach_ten').eq('id', p.hoiThoaiId).maybeSingle()).data?.khach_ten
  return { traLoi: thayTen(chon.kb.tra_loi ?? '', ten).trim(), nhanRieng: thayTen(chon.kb.nhan_rieng ?? '', ten).trim() }
}

type SuKienNhan = {
  sender: { id: string }
  recipient: { id: string }
  timestamp: number
  message?: { mid: string; text?: string; attachments?: unknown[]; is_echo?: boolean }
  postback?: { mid?: string; title?: string; payload?: string }
}

export async function xuLyTinNhan(trang: Trang, e: SuKienNhan) {
  const laEcho = !!e.message?.is_echo
  const khachId = laEcho ? e.recipient.id : e.sender.id
  const fbId = e.message?.mid ?? e.postback?.mid ?? `pb_${khachId}_${e.timestamp}`
  const noiDung = e.message?.text ?? e.postback?.title ?? null
  if (!e.message && !e.postback) return // bỏ qua đã xem, đã nhận...

  const kq = await luuTin({
    trang,
    loai: 'tin_nhan',
    khachId,
    fbId,
    chieu: laEcho ? 'ra' : 'vao',
    noiDung,
    dinhKem: e.message?.attachments,
    thoiGian: new Date(e.timestamp),
  })
  if (!kq || laEcho) return

  const td = await timTraLoiTuDong({ trangId: trang.id, loai: 'tin_nhan', noiDung, hoiThoaiId: kq.hoiThoaiId })
  if (td?.traLoi) {
    const r = await guiTinNhan(trang.access_token, khachId, td.traLoi)
    await luuTin({ trang, loai: 'tin_nhan', khachId, fbId: r.message_id, chieu: 'ra', noiDung: td.traLoi })
  }
}

type SuKienBinhLuan = {
  item: string
  verb: string
  comment_id?: string
  post_id?: string
  parent_id?: string
  from?: { id: string; name?: string }
  message?: string
  photo?: string
  created_time?: number
}

export async function xuLyBinhLuan(trang: Trang, v: SuKienBinhLuan) {
  if (v.item !== 'comment' || !v.comment_id || !v.from) return

  if (v.verb === 'remove') {
    await db().from('tin').delete().eq('fb_id', v.comment_id)
    return
  }
  if (v.verb !== 'add') return

  const thoiGian = v.created_time ? new Date(v.created_time * 1000) : undefined
  const dinhKem = v.photo ? [{ type: 'image', payload: { url: v.photo } }] : undefined

  // Bình luận của chính page (trả lời trên Facebook): gắn vào hội thoại của bình luận gốc
  if (v.from.id === trang.id) {
    if (!v.parent_id) return
    const { data: goc } = await db()
      .from('tin')
      .select('hoi_thoai:hoi_thoai_id (khach_id, bai_viet_id)')
      .eq('fb_id', v.parent_id)
      .maybeSingle()
    const h = goc?.hoi_thoai as unknown as { khach_id: string; bai_viet_id: string } | null
    if (!h) return
    await luuTin({ trang, loai: 'binh_luan', khachId: h.khach_id, baiVietId: h.bai_viet_id, fbId: v.comment_id, chieu: 'ra', noiDung: v.message ?? null, dinhKem, thoiGian })
    return
  }

  const kq = await luuTin({
    trang,
    loai: 'binh_luan',
    khachId: v.from.id,
    khachTen: v.from.name,
    baiVietId: v.post_id ?? '',
    fbId: v.comment_id,
    chieu: 'vao',
    noiDung: v.message ?? null,
    dinhKem,
    thoiGian,
  })
  if (!kq) return

  // Ẩn bình luận có SĐT để đối thủ không xin được số khách; hoặc ẩn tất cả nếu page bật
  if (trang.an_tat_ca_binh_luan || (trang.an_binh_luan_sdt && kq.sdt)) {
    try {
      await anBinhLuan(trang.access_token, v.comment_id, true)
      await db().from('tin').update({ da_an: true }).eq('id', kq.tinId)
    } catch (e) {
      console.error('Ẩn bình luận lỗi:', e)
    }
  }

  const td = await timTraLoiTuDong({ trangId: trang.id, loai: 'binh_luan', noiDung: v.message ?? null, hoiThoaiId: kq.hoiThoaiId, khachTen: v.from.name })
  if (!td) return
  const chung = { trang, loai: 'binh_luan' as const, khachId: v.from.id, baiVietId: v.post_id ?? '', chieu: 'ra' as const }
  // Nhắn riêng trước: Facebook chỉ cho nhắn riêng 1 lần cho mỗi bình luận, trong vòng 7 ngày
  if (td.nhanRieng) {
    try {
      const r = await nhanRiengBinhLuan(trang.access_token, v.comment_id, td.nhanRieng)
      await luuTin({ ...chung, fbId: r.message_id, noiDung: `[Nhắn riêng] ${td.nhanRieng}` })
    } catch (e) {
      console.error('Tự nhắn riêng bình luận lỗi:', e)
    }
  }
  if (td.traLoi) {
    const r = await traLoiBinhLuan(trang.access_token, v.comment_id, td.traLoi)
    await luuTin({ ...chung, fbId: r.id, noiDung: td.traLoi })
  }
}
