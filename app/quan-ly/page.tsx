import Link from 'next/link'
import { after } from 'next/server'
import { db } from '@/lib/db'
import { batBuocDangNhap, locHoiThoai } from '@/lib/phien'
import { ChonPhuTrach, ChonThe, KhungTraLoi, LamMoi, NutAnHien, NutChuaDoc, SoDienThoai } from './HopThuClient'

type HoiThoai = {
  id: string
  trang_id: string
  loai: 'tin_nhan' | 'binh_luan'
  khach_id: string
  khach_ten: string | null
  bai_viet_id: string
  so_dien_thoai: string | null
  the: string[]
  tin_cuoi: string | null
  chua_doc: number
  cap_nhat_luc: string
  nguoi_phu_trach: string | null
}
type Tin = { id: string; chieu: 'vao' | 'ra'; noi_dung: string | null; dinh_kem: { type?: string; payload?: { url?: string } }[] | null; da_an: boolean; tao_luc: string; nguoi_gui_id: string | null }

const LOC = [
  ['', 'Tất cả'],
  ['cua_toi', 'Của tôi'],
  ['chua_giao', 'Chưa giao'],
  ['tin_nhan', 'Tin nhắn'],
  ['binh_luan', 'Bình luận'],
  ['chua_doc', 'Chưa đọc'],
  ['co_sdt', 'Có SĐT'],
  ['chua_sdt', 'Chưa có SĐT'],
] as const

const gio = (s: string) => {
  const d = new Date(s)
  const homNay = new Date().toDateString() === d.toDateString()
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    ...(homNay ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
  })
}

export default async function HopThu({ searchParams }: PageProps<'/quan-ly'>) {
  const phien = await batBuocDangNhap()
  const { nguoiDung, trangIds, chiCuaMinh, chuIds } = phien
  const sp = await searchParams
  const lay = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '')
  const [h, loc, trangLoc, theLoc, q] = ['h', 'loc', 'trang', 'the', 'q'].map(lay)

  const lienKet = (doi: Record<string, string>) => {
    const p = new URLSearchParams({ loc, trang: trangLoc, the: theLoc, q, h, ...doi })
    for (const [k, v] of [...p]) if (!v) p.delete(k)
    return `/quan-ly${p.size ? `?${p}` : ''}`
  }

  if (!trangIds.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Chưa có Fanpage nào</h1>
        <p className="mt-2 text-phu">Đăng nhập lại và chọn các Page bạn muốn quản lý khi Facebook hỏi quyền.</p>
        <a href="/api/fb/dang-nhap" className="mt-6 inline-block rounded-lg bg-[#1877f2] px-4 py-2 font-semibold text-white">
          Kết nối Fanpage
        </a>
      </div>
    )
  }

  let truyVan = db()
    .from('hoi_thoai')
    .select('id, trang_id, loai, khach_id, khach_ten, bai_viet_id, so_dien_thoai, the, tin_cuoi, chua_doc, cap_nhat_luc, nguoi_phu_trach')
    .order('cap_nhat_luc', { ascending: false })
    .limit(100)
  // Quyền xem: page được chọn (hoặc mọi page), nhân viên bị giới hạn chỉ thấy hội thoại giao cho mình
  const quyen = locHoiThoai({ ...phien, trangIds: trangLoc && trangIds.includes(trangLoc) ? [trangLoc] : trangIds })
  if (loc === 'cua_toi') truyVan = truyVan.eq('nguoi_phu_trach', nguoiDung.id)
  if (loc === 'chua_giao') truyVan = truyVan.is('nguoi_phu_trach', null)
  if (loc === 'tin_nhan' || loc === 'binh_luan') truyVan = truyVan.eq('loai', loc)
  if (loc === 'chua_doc') truyVan = truyVan.gt('chua_doc', 0)
  if (loc === 'co_sdt') truyVan = truyVan.not('so_dien_thoai', 'is', null)
  if (loc === 'chua_sdt') truyVan = truyVan.is('so_dien_thoai', null)
  if (theLoc) truyVan = truyVan.contains('the', [theLoc])
  if (q) {
    const an = q.replace(/[%,()]/g, ' ')
    truyVan = truyVan.or(`and(or(${quyen}),or(khach_ten.ilike.%${an}%,so_dien_thoai.ilike.%${an}%,tin_cuoi.ilike.%${an}%))`)
  } else truyVan = truyVan.or(quyen)

  // Thẻ, mẫu câu: của mình + của chủ shop (nếu mình là nhân viên)
  const nhom = [nguoiDung.id, ...chuIds]
  // Tin của hội thoại đang mở: tải song song luôn, chỉ dùng nếu người dùng có quyền xem hội thoại đó (kiểm tra bên dưới)
  const layTin = h
    ? db().from('tin').select('id, chieu, noi_dung, dinh_kem, da_an, tao_luc, nguoi_gui_id').eq('hoi_thoai_id', h).order('tao_luc', { ascending: false }).limit(200).then((r) => r.data)
    : null
  const [{ data: dsHt }, { data: dsTrang }, { data: dsThe }, { data: dsMau }, { data: dsThanhVien }] = await Promise.all([
    truyVan,
    db().from('fb_trang').select('id, ten, anh').in('id', trangIds),
    db().from('the_hoi_thoai').select('id, ten, mau').in('nguoi_dung_id', nhom).order('ten'),
    db().from('mau_cau').select('phim_tat, noi_dung').in('nguoi_dung_id', nhom).order('phim_tat'),
    db().from('trang_quan_tri').select('trang_id, nguoi_dung_id, nguoi:nguoi_dung_id (ten)').in('trang_id', trangIds).eq('bat', true),
  ])
  // Người quản lý từng page (để giao hội thoại) và tên theo id
  const thanhVien = (dsThanhVien ?? []) as unknown as { trang_id: string; nguoi_dung_id: string; nguoi: { ten: string } | null }[]
  const tenNguoi = new Map(thanhVien.map((r) => [r.nguoi_dung_id, r.nguoi?.ten ?? 'Không rõ']))
  const nguoiCuaTrang = (trangId: string) =>
    thanhVien.filter((r) => r.trang_id === trangId).map((r) => ({ id: r.nguoi_dung_id, ten: tenNguoi.get(r.nguoi_dung_id)! }))
  const hoiThoai = (dsHt ?? []) as HoiThoai[]
  const trang = new Map((dsTrang ?? []).map((t) => [t.id as string, t as { id: string; ten: string; anh: string | null }]))
  // Thẻ trùng tên giữa mình và chủ shop: giữ một
  const the = [...new Map(((dsThe ?? []) as { id: string; ten: string; mau: string }[]).map((t) => [t.ten, t])).values()]
  const mauThe = new Map(the.map((t) => [t.ten, t.mau]))

  // Hội thoại đang mở: có thể không nằm trong danh sách đã lọc
  let dangMo = hoiThoai.find((x) => x.id === h) ?? null
  if (h && !dangMo) {
    const { data } = await db().from('hoi_thoai').select('*').eq('id', h).or(locHoiThoai(phien)).maybeSingle()
    dangMo = data as HoiThoai | null
  }
  let tin: Tin[] = []
  if (dangMo && layTin) {
    const data = await layTin
    tin = ((data ?? []) as Tin[]).reverse()
    // Đánh dấu đã đọc sau khi đã trả trang, không bắt người dùng chờ
    const id = dangMo.id
    if (dangMo.chua_doc) after(() => db().from('hoi_thoai').update({ chua_doc: 0 }).eq('id', id))
  }

  return (
    <div className="flex h-full">
      <LamMoi />
      {/* Cột danh sách hội thoại */}
      <aside className={`flex w-full flex-col border-r border-slate-200 bg-white md:w-96 ${dangMo ? 'hidden md:flex' : 'flex'}`}>
        <div className="space-y-2 border-b border-slate-200 p-3">
          <form action="/quan-ly" className="flex gap-2">
            {loc && <input type="hidden" name="loc" value={loc} />}
            {trangLoc && <input type="hidden" name="trang" value={trangLoc} />}
            {theLoc && <input type="hidden" name="the" value={theLoc} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Tìm tên, SĐT, nội dung…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </form>
          <div className="flex flex-wrap gap-1">
            {LOC.map(([ma, ten]) => (
              <Link
                key={ma}
                href={lienKet({ loc: ma, h: '' })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${loc === ma ? 'bg-chinh text-white' : 'bg-slate-100 text-phu hover:bg-slate-200'}`}
              >
                {ten}
              </Link>
            ))}
          </div>
          {(trang.size > 1 || the.length > 0) && (
            <div className="flex flex-wrap gap-1 text-xs">
              {trang.size > 1 &&
                [...trang.values()].map((t) => (
                  <Link
                    key={t.id}
                    href={lienKet({ trang: trangLoc === t.id ? '' : t.id, h: '' })}
                    className={`rounded-full border px-2 py-0.5 ${trangLoc === t.id ? 'border-chinh text-chinh' : 'border-slate-200 text-phu'}`}
                  >
                    {t.ten}
                  </Link>
                ))}
              {the.map((t) => (
                <Link
                  key={t.id}
                  href={lienKet({ the: theLoc === t.ten ? '' : t.ten, h: '' })}
                  className="rounded-full px-2 py-0.5 text-white"
                  style={{ background: t.mau, opacity: theLoc && theLoc !== t.ten ? 0.45 : 1 }}
                >
                  {t.ten}
                </Link>
              ))}
            </div>
          )}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {hoiThoai.length === 0 && <li className="p-6 text-center text-sm text-phu">Chưa có hội thoại nào.</li>}
          {hoiThoai.map((x) => (
            <li key={x.id}>
              <Link
                href={lienKet({ h: x.id })}
                className={`flex gap-3 border-b border-slate-100 px-3 py-3 hover:bg-slate-50 ${x.id === dangMo?.id ? 'bg-chinh/5' : ''}`}
              >
                <div className="relative h-10 w-10 shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-semibold text-phu">
                    {(x.khach_ten ?? '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 text-sm" title={x.loai === 'tin_nhan' ? 'Tin nhắn' : 'Bình luận'}>
                    {x.loai === 'tin_nhan' ? '💬' : '🗨️'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`truncate ${x.chua_doc ? 'font-bold' : 'font-medium'}`}>{x.khach_ten ?? 'Khách'}</span>
                    <span className="ml-auto shrink-0 text-xs text-phu">{gio(x.cap_nhat_luc)}</span>
                  </div>
                  <p className={`truncate text-sm ${x.chua_doc ? 'font-semibold text-chu' : 'text-phu'}`}>{x.tin_cuoi}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                    {trang.size > 1 && <span className="text-phu">{trang.get(x.trang_id)?.ten}</span>}
                    {x.so_dien_thoai && <span className="rounded bg-green-100 px-1.5 text-green-700">📞 {x.so_dien_thoai}</span>}
                    {x.nguoi_phu_trach && (
                      <span className="rounded bg-slate-100 px-1.5 text-phu">👤 {x.nguoi_phu_trach === nguoiDung.id ? 'Tôi' : tenNguoi.get(x.nguoi_phu_trach)}</span>
                    )}
                    {x.the.map((t) => (
                      <span key={t} className="rounded px-1.5 text-white" style={{ background: mauThe.get(t) ?? '#64748b' }}>
                        {t}
                      </span>
                    ))}
                    {x.chua_doc > 0 && <span className="ml-auto rounded-full bg-red-500 px-1.5 font-bold text-white">{x.chua_doc}</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Khung hội thoại */}
      {dangMo ? (
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
            <Link href={lienKet({ h: '' })} className="text-chinh md:hidden">←</Link>
            <div className="min-w-0">
              <p className="truncate font-semibold">{dangMo.khach_ten ?? 'Khách'}</p>
              <p className="truncate text-xs text-phu">
                {dangMo.loai === 'tin_nhan' ? 'Tin nhắn' : 'Bình luận'} · {trang.get(dangMo.trang_id)?.ten}
                {dangMo.bai_viet_id && (
                  <>
                    {' · '}
                    <a href={`https://www.facebook.com/${dangMo.bai_viet_id}`} target="_blank" rel="noreferrer" className="text-chinh hover:underline">
                      Xem bài viết
                    </a>
                  </>
                )}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <SoDienThoai hoiThoaiId={dangMo.id} giaTri={dangMo.so_dien_thoai ?? ''} />
              <ChonPhuTrach hoiThoaiId={dangMo.id} dangChon={dangMo.nguoi_phu_trach} nguoi={nguoiCuaTrang(dangMo.trang_id)} toi={nguoiDung.id} />
              <ChonThe hoiThoaiId={dangMo.id} dangChon={dangMo.the} tatCa={the} />
              <NutChuaDoc hoiThoaiId={dangMo.id} />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto p-4">
            <div className="space-y-2">
              {tin.map((t) => (
                <div key={t.id} className={`flex ${t.chieu === 'ra' ? 'justify-end' : 'justify-start'}`}>
                  <div className="group max-w-[75%]">
                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[15px] ${
                        t.chieu === 'ra' ? 'bg-chinh text-white' : 'bg-white text-chu shadow-sm'
                      } ${t.da_an ? 'opacity-60' : ''}`}
                    >
                      {t.noi_dung}
                      {t.dinh_kem?.map((d, i) =>
                        d.type === 'image' && d.payload?.url ? (
                          <img key={i} src={d.payload.url} alt="" className="mt-1 max-h-60 rounded-lg" />
                        ) : d.payload?.url ? (
                          <a key={i} href={d.payload.url} target="_blank" rel="noreferrer" className="block underline">
                            [{d.type ?? 'tệp'}]
                          </a>
                        ) : null,
                      )}
                    </div>
                    <div className={`mt-0.5 flex gap-2 text-[11px] text-phu ${t.chieu === 'ra' ? 'justify-end' : ''}`}>
                      {t.chieu === 'ra' && t.nguoi_gui_id && <span>{tenNguoi.get(t.nguoi_gui_id) ?? 'Nhân viên'} ·</span>}
                      <span>{gio(t.tao_luc)}</span>
                      {t.da_an && <span className="text-amber-600">Đã ẩn</span>}
                      {dangMo.loai === 'binh_luan' && t.chieu === 'vao' && <NutAnHien tinId={t.id} daAn={t.da_an} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <KhungTraLoi key={dangMo.id} hoiThoaiId={dangMo.id} laBinhLuan={dangMo.loai === 'binh_luan'} mauCau={dsMau ?? []} />
        </section>
      ) : (
        <section className="hidden flex-1 items-center justify-center text-phu md:flex">Chọn một hội thoại để xem</section>
      )}
    </div>
  )
}
