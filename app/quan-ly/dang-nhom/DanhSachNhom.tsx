'use client'

import { useActionState, useEffect, useEffectEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { boDanhDauNhom, danhDauDaDangNhom, themNhieuNhom, xoaNhom } from '../dang-bai/actions'
import { NutHanhDong } from '../NutHanhDong'
import { ChuCaiDau, IChep, IGui, IMoNgoai, INhom, IPhat, ITim, IXoa, IXong, ThanhTienDo } from './BieuTuong'
import { moCuaSoFacebook } from './moCuaSo'

export type Nhom = { id: string; ten: string; link: string; ghi_chu: string | null; daDangBaiNay: string | null; lanCuoi: string | null }

const ngay = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const boDau = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()

// Những cụm 2 chữ xuất hiện trong tên của ít nhất 2 nhóm (ví dụ "công nghệ", "mua bán"), tối đa 8 cụm
const BO_QUA = new Set(['nhóm', 'hội', 'group', 'cộng đồng', 'của', 'và', 'các', 'những'])
function tuGoiY(nhom: Nhom[]) {
  const dem = new Map<string, number>()
  for (const n of nhom) {
    const chu = n.ten.toLocaleLowerCase('vi').split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1 && !BO_QUA.has(w))
    const cum = new Set<string>()
    for (let i = 0; i + 1 < chu.length; i++) cum.add(`${chu[i]} ${chu[i + 1]}`)
    for (const c of cum) dem.set(c, (dem.get(c) ?? 0) + 1)
  }
  return [...dem.entries()]
    .filter(([, so]) => so >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c]) => c)
}

// Chép bài và mở nhóm trong cùng một cú bấm (trình duyệt chỉ cho mở tab mới khi người dùng bấm)
// Chép ảnh vào bộ nhớ tạm để dán (Ctrl+V) thẳng vào ô đăng bài Facebook. Trình duyệt chỉ nhận PNG nên đổi định dạng nếu cần.
async function chepAnh(url: string) {
  const goc = await (await fetch(url)).blob()
  let png = goc
  if (goc.type !== 'image/png') {
    const hinh = await createImageBitmap(goc)
    const c = document.createElement('canvas')
    c.width = hinh.width
    c.height = hinh.height
    c.getContext('2d')!.drawImage(hinh, 0, 0)
    png = await new Promise<Blob>((ok, loi) => c.toBlob((b) => (b ? ok(b) : loi(new Error('Không đổi được ảnh'))), 'image/png'))
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}

const Phim = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-slate-300 bg-slate-50 px-1 font-sans text-[10px] font-semibold text-chu">{children}</kbd>
)

// Nút chép chữ + chép từng ảnh, dùng sau khi đã mở nhóm
function ThanhChep({ noiDung, anh }: { noiDung: string; anh: string[] }) {
  const [daChep, setDaChep] = useState<string>('chu')
  const [loi, setLoi] = useState('')
  const buoc = [
    <>
      Ở cửa sổ Facebook bên phải, bấm ô <b>“Bạn viết gì đi…”</b> rồi <Phim>Ctrl</Phim>+<Phim>V</Phim> để dán chữ.
    </>,
    ...(anh.length
      ? [
          <>
            Bấm <b>Chép ảnh</b> bên dưới, bấm vào ô đang soạn rồi <Phim>Ctrl</Phim>+<Phim>V</Phim>. Mỗi ảnh làm một lần.
          </>,
        ]
      : []),
    <>
      Bấm <b>Đăng</b> trên Facebook, quay lại đây nhấn <Phim>Enter</Phim>.
    </>,
  ]
  const nutChep = (dang: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition ${dang ? 'bg-green-600 text-white' : 'border border-slate-300 bg-white hover:bg-slate-50'}`
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white p-3">
      <ol className="space-y-1.5 text-xs text-phu">
        {buoc.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-chu">{i + 1}</span>
            <span>{b}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigator.clipboard.writeText(noiDung).then(() => setDaChep('chu'))} className={`${nutChep(daChep === 'chu')} px-2.5 py-1.5`}>
          {daChep === 'chu' ? <IXong className="h-3.5 w-3.5" /> : <IChep className="h-3.5 w-3.5" />}
          {daChep === 'chu' ? 'Đã chép chữ' : 'Chép chữ'}
        </button>
        {anh.map((u, i) => (
          <button
            key={u}
            type="button"
            onClick={() =>
              chepAnh(u)
                .then(() => (setDaChep(u), setLoi('')))
                .catch(() => setLoi('Trình duyệt không cho chép ảnh. Hãy mở ảnh, chuột phải → Sao chép hình ảnh.'))
            }
            className={`${nutChep(daChep === u)} p-1 pr-2.5`}
          >
            <img src={u} alt="" className="h-7 w-7 rounded-md object-cover" />
            {daChep === u ? 'Đã chép' : `Chép ảnh ${i + 1}`}
          </button>
        ))}
      </div>
      {loi && <p className="mt-2 text-xs text-red-600">{loi}</p>}
    </div>
  )
}

function chepVaMo(noiDung: string, link: string) {
  navigator.clipboard.writeText(noiDung).catch(() => {})
  moCuaSoFacebook(link)
}

// Đường dẫn của Facebook có dạng /groups/... nhưng không phải nhóm
const KHONG_PHAI_NHOM = new Set(['joins', 'feed', 'discover', 'create', 'notifications', 'search', 'category', 'you', 'manage', 'pending', 'invites'])

// Lấy nhóm từ nội dung HTML người dùng tự chép (Ctrl+A, Ctrl+C) ở trang "Nhóm của bạn" trên Facebook
function layNhomTuHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const theoMa = new Map<string, string>()
  for (const a of Array.from(doc.querySelectorAll('a[href*="/groups/"]'))) {
    const m = (a.getAttribute('href') ?? '').match(/facebook\.com\/groups\/([\w.-]+)|^\/groups\/([\w.-]+)/)
    const ma = m?.[1] ?? m?.[2]
    if (!ma || KHONG_PHAI_NHOM.has(ma.toLowerCase())) continue
    // Một nhóm có nhiều thẻ link (ảnh, tên, "Xem nhóm"): giữ chữ dài nhất làm tên, bỏ dòng phụ
    const ten = (a.textContent ?? '').split(/\n|Lần hoạt động|Last active|Xem nhóm|View group/)[0].replace(/\s+/g, ' ').trim()
    if (!theoMa.has(ma) || ten.length > (theoMa.get(ma) ?? '').length) theoMa.set(ma, ten.slice(0, 120))
  }
  return [...theoMa.entries()].map(([ma, ten]) => ({ ten, link: `https://www.facebook.com/groups/${ma}` }))
}

export function FormThemNhieuNhom() {
  const [timDuoc, setTimDuoc] = useState<{ ten: string; link: string }[]>([])
  const [boChon, setBoChon] = useState<Set<string>>(new Set())
  const [danhSach, setDanhSach] = useState('')
  const [kq, gui, dang] = useActionState(async (truoc: Awaited<ReturnType<typeof themNhieuNhom>> | null, f: FormData) => {
    const r = await themNhieuNhom(truoc, f)
    if (r.ok) {
      setTimDuoc([])
      setDanhSach('')
    }
    return r
  }, null)
  const [loiDan, setLoiDan] = useState('')
  const [nhapTay, setNhapTay] = useState(false)

  function khiDan(e: React.ClipboardEvent) {
    const html = e.clipboardData.getData('text/html')
    if (!html) return // dán chữ thường (link) thì để ô nhập tay xử lý
    e.preventDefault()
    const ds = layNhomTuHtml(html)
    setLoiDan(ds.length ? '' : 'Không thấy nhóm nào trong nội dung vừa dán. Hãy chắc là bạn chép ở trang danh sách nhóm và đã cuộn xuống hết.')
    setTimDuoc(ds)
    setBoChon(new Set())
  }

  const daChon = timDuoc.filter((n) => !boChon.has(n.link))
  // Gửi cho máy chủ theo định dạng "Tên | link" mỗi dòng
  const giaTriGui = timDuoc.length ? daChon.map((n) => `${n.ten} | ${n.link}`).join('\n') : danhSach

  return (
    <form action={gui} className="grid gap-3 p-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-phu">
        <li>
          Mở{' '}
          <a href="https://www.facebook.com/groups/joins/" target="_blank" rel="noreferrer" className="font-semibold text-chinh underline">
            trang Nhóm của bạn trên Facebook
          </a>{' '}
          (máy tính), cuộn xuống cuối để hiện hết nhóm.
        </li>
        <li>
          Bấm <b>Ctrl+A</b> rồi <b>Ctrl+C</b>.
        </li>
        <li>
          Quay lại đây, bấm vào ô bên dưới rồi <b>Ctrl+V</b>.
        </li>
      </ol>
      <div
        tabIndex={0}
        onPaste={khiDan}
        className="grid min-h-20 place-items-center rounded-lg border-2 border-dashed border-chinh/40 bg-blue-50/50 p-3 text-center text-sm text-chinh focus:border-chinh focus:outline-none"
      >
        Bấm vào đây rồi Ctrl+V
      </div>
      {loiDan && <p className="text-sm text-red-600">{loiDan}</p>}

      {timDuoc.length > 0 && (
        <div className="rounded-lg border border-slate-200">
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm">
            <b>Tìm thấy {timDuoc.length} nhóm</b>
            <button type="button" onClick={() => setBoChon(new Set())} className="text-chinh hover:underline">
              Chọn tất cả
            </button>
            <button type="button" onClick={() => setBoChon(new Set(timDuoc.map((n) => n.link)))} className="text-phu hover:underline">
              Bỏ chọn hết
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto px-3 py-1 text-sm">
            {timDuoc.map((n) => (
              <li key={n.link} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={!boChon.has(n.link)}
                  onChange={() =>
                    setBoChon((s) => {
                      const m = new Set(s)
                      if (m.has(n.link)) m.delete(n.link)
                      else m.add(n.link)
                      return m
                    })
                  }
                />
                <span className="truncate">{n.ten || n.link}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nhapTay && !timDuoc.length && (
        <textarea
          value={danhSach}
          onChange={(e) => setDanhSach(e.target.value)}
          rows={4}
          placeholder={'Mỗi dòng một link nhóm, có thể ghi tên trước:\nHội mẹ bỉm sữa | https://www.facebook.com/groups/123456789'}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      )}
      <input type="hidden" name="danh_sach" value={giaTriGui} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={dang || !giaTriGui.trim()}
          className="rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50"
        >
          {dang ? 'Đang thêm…' : timDuoc.length ? `Thêm ${daChon.length} nhóm đã chọn` : 'Thêm các nhóm'}
        </button>
        {!timDuoc.length && (
          <button type="button" onClick={() => setNhapTay(!nhapTay)} className="text-xs text-phu hover:underline">
            {nhapTay ? 'Ẩn ô nhập link' : 'Hoặc dán từng link'}
          </button>
        )}
      </div>
      {kq && <p className={`text-sm ${kq.ok ? 'text-green-700' : 'text-red-600'}`}>{kq.thongBao}</p>}
    </form>
  )
}

export default function DanhSachNhom({ nhom: nhomGoc, bai }: { nhom: Nhom[]; bai: { id: string; noiDung: string; bienThe: string[]; anh: string[] } | null }) {
  const router = useRouter()
  // Đánh dấu ngay trên màn hình (không chờ máy chủ): id nhóm → thời điểm đánh dấu, null = vừa bỏ đánh dấu
  const [tamThoi, setTamThoi] = useState<Map<string, string | null>>(new Map())
  const nhom = nhomGoc.map((n) => (tamThoi.has(n.id) ? { ...n, daDangBaiNay: tamThoi.get(n.id)! } : n))
  function luuDanhDau(nhomId: string, daDang: boolean) {
    if (!bai) return
    setTamThoi((m) => new Map(m).set(nhomId, daDang ? new Date().toISOString() : null))
    chay(async () => {
      await (daDang ? danhDauDaDangNhom(nhomId, bai.id) : boDanhDauNhom(nhomId, bai.id))
      router.refresh()
    })
  }
  // Các phiên bản nội dung: xoay vòng mỗi nhóm một bản
  const banNoiDung = bai ? [bai.noiDung, ...bai.bienThe].filter((x) => x.trim()) : []
  const noiDungThu = (i: number) => (banNoiDung.length ? banNoiDung[i % banNoiDung.length] : '')
  // Mặc định tích sẵn các nhóm chưa đăng bài đang chọn
  const [chon, setChon] = useState<Set<string>>(() => new Set(bai ? nhom.filter((n) => !n.daDangBaiNay).map((n) => n.id) : []))
  const [hangDoi, setHangDoi] = useState<string[] | null>(null) // các nhóm đang đăng lần lượt
  const [viTri, setViTri] = useState(0)
  const [moLe, setMoLe] = useState<string | null>(null) // nhóm vừa mở bằng nút "Chép & mở"
  const [, chay] = useTransition()
  const theoId = new Map(nhom.map((n) => [n.id, n]))

  const doiChon = (id: string) =>
    setChon((c) => {
      const m = new Set(c)
      if (m.has(id)) m.delete(id)
      else m.add(id)
      return m
    })

  function batDau() {
    if (!bai) return
    const ds = nhom.filter((n) => chon.has(n.id) && !n.daDangBaiNay).map((n) => n.id)
    if (!ds.length) return
    setHangDoi(ds)
    setViTri(0)
    chepVaMo(noiDungThu(0), theoId.get(ds[0])!.link)
  }

  // Sang nhóm kế tiếp; daDang = true thì đánh dấu nhóm hiện tại đã đăng
  function tiep(daDang: boolean) {
    if (!bai || !hangDoi) return
    const hienTai = hangDoi[viTri]
    const sau = hangDoi[viTri + 1]
    if (sau) chepVaMo(noiDungThu(viTri + 1), theoId.get(sau)!.link)
    if (daDang) luuDanhDau(hienTai, true)
    setChon((c) => {
      const m = new Set(c)
      m.delete(hienTai)
      return m
    })
    if (sau) setViTri(viTri + 1)
    else setHangDoi(null)
  }

  const dangDang = hangDoi ? theoId.get(hangDoi[viTri]) : null

  // Phím tắt khi đăng lần lượt: Enter = đã đăng → nhóm tiếp, B = bỏ qua, Esc = dừng
  const khiBamPhim = useEffectEvent((e: KeyboardEvent) => {
    const o = e.target as HTMLElement
    if (o.closest('input, textarea, select, [contenteditable="true"]')) return
    if (e.key === 'Enter') {
      e.preventDefault()
      tiep(true)
    } else if (e.key === 'b' || e.key === 'B') tiep(false)
    else if (e.key === 'Escape') setHangDoi(null)
  })
  useEffect(() => {
    if (!hangDoi) return
    window.addEventListener('keydown', khiBamPhim)
    return () => window.removeEventListener('keydown', khiBamPhim)
  }, [hangDoi])

  // Tab: nhóm chưa đăng / đã đăng bài đang chọn. Đánh dấu đã đăng thì nhóm tự chuyển sang tab "Đã đăng".
  const [tab, setTab] = useState<'chua' | 'da'>('chua')
  const chuaDang = bai ? nhom.filter((n) => !n.daDangBaiNay) : nhom
  const daDangDs = bai ? nhom.filter((n) => n.daDangBaiNay).sort((a, b) => b.daDangBaiNay!.localeCompare(a.daDangBaiNay!)) : []
  const nhomTab = tab === 'da' && bai ? daDangDs : chuaDang

  // Tìm nhóm theo tên / ghi chú, không phân biệt dấu ("cong nghe" khớp "Công Nghệ")
  const [tuKhoa, setTuKhoa] = useState('')
  const tk = boDau(tuKhoa.trim())
  const hienThi = tk ? nhomTab.filter((n) => boDau(`${n.ten} ${n.ghi_chu ?? ''}`).includes(tk)) : nhomTab
  const coTheChon = tab === 'chua' ? hienThi : []
  const daChonHet = coTheChon.length > 0 && coTheChon.every((n) => chon.has(n.id))
  const chonKetQua = (bat: boolean) =>
    setChon((c) => {
      const m = new Set(c)
      for (const n of coTheChon) {
        if (bat) m.add(n.id)
        else m.delete(n.id)
      }
      return m
    })
  const soDaChon = chuaDang.filter((n) => chon.has(n.id)).length

  if (!nhom.length) {
    return (
      <div className="mt-3 flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-chinh/10 text-chinh">
          <INhom className="h-6 w-6" />
        </span>
        <p className="mt-3 font-semibold">Chưa có nhóm nào</p>
        <p className="mt-1 max-w-sm text-sm text-phu">Dùng mục &quot;Thêm nhóm từ Facebook&quot; ở cột trái để lấy danh sách nhóm bạn đã tham gia.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Đang đăng lần lượt */}
      {bai && dangDang && (
        <div className="sticky top-0 z-10 mt-3 rounded-xl border border-chinh/30 bg-white p-4 text-sm shadow-lg shadow-chinh/5">
          <div className="flex items-center gap-2 text-xs font-medium text-phu">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Đang đăng lần lượt · nhóm {viTri + 1}/{hangDoi!.length}
            <button onClick={() => setHangDoi(null)} className="ml-auto rounded-md px-2 py-1 hover:bg-slate-100">
              Dừng <Phim>Esc</Phim>
            </button>
          </div>
          <div className="mt-2">
            <ThanhTienDo phan={viTri / hangDoi!.length} />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <ChuCaiDau ten={dangDang.ten} className="h-10 w-10 text-base" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{dangDang.ten}</p>
              {banNoiDung.length > 1 && <p className="text-xs text-violet-700">Phiên bản nội dung {(viTri % banNoiDung.length) + 1}</p>}
            </div>
          </div>
          <div className="mt-3">
            <ThanhChep key={dangDang.id} noiDung={noiDungThu(viTri)} anh={bai.anh} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => tiep(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 font-semibold text-white hover:bg-green-700">
              <IXong className="h-4 w-4" />
              Đã đăng{viTri + 1 < hangDoi!.length ? ', sang nhóm tiếp' : ', hoàn tất'}
              <kbd className="rounded bg-white/20 px-1.5 font-sans text-[11px]">Enter</kbd>
            </button>
            <button onClick={() => tiep(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 hover:bg-slate-50">
              Bỏ qua <Phim>B</Phim>
            </button>
            <button onClick={() => chepVaMo(noiDungThu(viTri), dangDang.link)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 hover:bg-slate-50">
              Mở lại
            </button>
          </div>
        </div>
      )}

      {!hangDoi && (
        <>
          {bai && (
            <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
              {(
                [
                  ['chua', `Chưa đăng (${chuaDang.length})`],
                  ['da', `Đã đăng (${daDangDs.length})`],
                ] as const
              ).map(([ma, nhan]) => (
                <button
                  key={ma}
                  onClick={() => setTab(ma)}
                  className={`flex-1 rounded-md px-3 py-1.5 ${tab === ma ? 'bg-white text-chu shadow-sm' : 'text-phu hover:text-chu'}`}
                >
                  {nhan}
                </button>
              ))}
            </div>
          )}

          <div className="relative mt-3">
            <ITim className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-phu" />
            <input
              type="search"
              value={tuKhoa}
              onChange={(e) => setTuKhoa(e.target.value)}
              placeholder="Tìm nhóm theo tên hoặc ghi chú…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-chinh focus:outline-none focus:ring-2 focus:ring-chinh/15"
            />
          </div>
          {tuGoiY(nhomTab).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tuGoiY(nhomTab).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTuKhoa(tuKhoa === t ? '' : t)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition ${tuKhoa === t ? 'bg-chinh text-white' : 'bg-slate-100 text-phu hover:bg-slate-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {bai && tab === 'chua' && chuaDang.length > 0 && (
            <div className="sticky top-0 z-10 mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-2 pl-3 text-sm shadow-sm backdrop-blur">
              <label className="flex cursor-pointer items-center gap-2 text-phu">
                <input type="checkbox" checked={daChonHet} onChange={(e) => chonKetQua(e.target.checked)} className="h-4 w-4 accent-chinh" />
                {tk ? `Chọn ${hienThi.length} kết quả` : 'Chọn tất cả'}
                {soDaChon > 0 && <span className="text-chu">· đã chọn {soDaChon}</span>}
              </label>
              <button
                onClick={batDau}
                disabled={!soDaChon}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-chinh px-4 py-2 font-semibold text-white hover:bg-chinh-dam disabled:opacity-50"
              >
                <IPhat className="h-3.5 w-3.5" />
                Đăng lần lượt {soDaChon} nhóm
              </button>
            </div>
          )}
        </>
      )}

      <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!hienThi.length && (
          <li className="px-4 py-10 text-center text-sm text-phu">
            {tk ? (
              `Không có nhóm nào có chữ "${tuKhoa}".`
            ) : tab === 'da' ? (
              'Chưa đăng bài này vào nhóm nào.'
            ) : (
              <span className="inline-flex flex-col items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-700">
                  <IXong className="h-5 w-5" />
                </span>
                <span>
                  <b className="text-chu">Hoàn tất!</b> Đã đăng bài này vào tất cả các nhóm.
                </span>
              </span>
            )}
          </li>
        )}
        {hienThi.map((n) => (
          <li
            key={n.id}
            className={`group flex flex-wrap items-center gap-3 px-3 py-2.5 transition ${dangDang?.id === n.id ? 'bg-chinh/5' : moLe === n.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
          >
            {tab === 'chua' && bai && (
              <input
                type="checkbox"
                checked={chon.has(n.id)}
                onChange={() => doiChon(n.id)}
                disabled={!!hangDoi}
                aria-label={`Chọn ${n.ten}`}
                className="h-4 w-4 accent-chinh"
              />
            )}
            <ChuCaiDau ten={n.ten} />
            <div className="min-w-0 flex-1">
              <a href={n.link} target="_blank" rel="noreferrer" className="group/link inline-flex max-w-full items-center gap-1 font-medium hover:text-chinh">
                <span className="truncate">{n.ten}</span>
                <IMoNgoai className="h-3 w-3 shrink-0 text-phu opacity-0 transition group-hover/link:opacity-100" />
              </a>
              <p className="truncate text-xs text-phu">
                {tab === 'da' && n.daDangBaiNay ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <IXong className="h-3 w-3" /> Đã đăng bài này {ngay(n.daDangBaiNay)}
                  </span>
                ) : n.lanCuoi ? (
                  `Lần đăng gần nhất ${ngay(n.lanCuoi)}`
                ) : (
                  'Chưa đăng bài nào'
                )}
                {n.ghi_chu && ` · ${n.ghi_chu}`}
              </p>
            </div>
            {tab === 'chua' && bai && !hangDoi && (
              <button
                onClick={() => (chepVaMo(noiDungThu(nhom.indexOf(n)), n.link), setMoLe(n.id))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-chu hover:border-chinh hover:text-chinh"
              >
                <IGui className="h-3.5 w-3.5" />
                Đăng
              </button>
            )}
            {tab === 'da' && bai && (
              <button onClick={() => luuDanhDau(n.id, false)} className="rounded-md px-2 py-1 text-xs text-phu hover:bg-slate-100">
                Bỏ đánh dấu
              </button>
            )}
            <NutHanhDong
              chay={xoaNhom.bind(null, n.id)}
              xacNhan={`Xóa nhóm ${n.ten} khỏi danh sách?`}
              className="rounded-md p-1.5 text-phu opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
            >
              <IXoa className="h-4 w-4" />
              <span className="sr-only">Xóa nhóm</span>
            </NutHanhDong>
            {bai && !hangDoi && moLe === n.id && tab === 'chua' && (
              <div className="basis-full space-y-2 pb-1">
                <ThanhChep noiDung={noiDungThu(nhom.indexOf(n))} anh={bai.anh} />
                <button
                  onClick={() => (luuDanhDau(n.id, true), setMoLe(null))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <IXong className="h-4 w-4" /> Đã đăng nhóm này
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
