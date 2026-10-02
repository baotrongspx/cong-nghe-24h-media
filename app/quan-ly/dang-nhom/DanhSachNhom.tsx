'use client'

import { useActionState, useState, useTransition } from 'react'
import { danhDauDaDangNhom, themNhieuNhom, xoaNhom } from '../dang-bai/actions'
import { NutHanhDong } from '../NutHanhDong'

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
function chepVaMo(noiDung: string, link: string) {
  navigator.clipboard.writeText(noiDung).catch(() => {})
  window.open(link, '_blank', 'noopener')
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
    <form action={gui} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-semibold">Lấy danh sách nhóm đã tham gia</p>
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

export default function DanhSachNhom({ nhom, bai }: { nhom: Nhom[]; bai: { id: string; noiDung: string } | null }) {
  // Mặc định tích sẵn các nhóm chưa đăng bài đang chọn
  const [chon, setChon] = useState<Set<string>>(() => new Set(bai ? nhom.filter((n) => !n.daDangBaiNay).map((n) => n.id) : []))
  const [hangDoi, setHangDoi] = useState<string[] | null>(null) // các nhóm đang đăng lần lượt
  const [viTri, setViTri] = useState(0)
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
    const ds = nhom.filter((n) => chon.has(n.id)).map((n) => n.id)
    if (!ds.length) return
    setHangDoi(ds)
    setViTri(0)
    chepVaMo(bai.noiDung, theoId.get(ds[0])!.link)
  }

  // Sang nhóm kế tiếp; daDang = true thì đánh dấu nhóm hiện tại đã đăng
  function tiep(daDang: boolean) {
    if (!bai || !hangDoi) return
    const hienTai = hangDoi[viTri]
    const sau = hangDoi[viTri + 1]
    if (sau) chepVaMo(bai.noiDung, theoId.get(sau)!.link)
    if (daDang) chay(() => danhDauDaDangNhom(hienTai, bai.id))
    setChon((c) => {
      const m = new Set(c)
      m.delete(hienTai)
      return m
    })
    if (sau) setViTri(viTri + 1)
    else setHangDoi(null)
  }

  const dangDang = hangDoi ? theoId.get(hangDoi[viTri]) : null

  // Tìm nhóm theo tên / ghi chú, không phân biệt dấu ("cong nghe" khớp "Công Nghệ")
  const [tuKhoa, setTuKhoa] = useState('')
  const tk = boDau(tuKhoa.trim())
  const hienThi = tk ? nhom.filter((n) => boDau(`${n.ten} ${n.ghi_chu ?? ''}`).includes(tk)) : nhom
  const daChonHet = hienThi.length > 0 && hienThi.every((n) => chon.has(n.id))
  const chonKetQua = (bat: boolean) =>
    setChon((c) => {
      const m = new Set(c)
      for (const n of hienThi) {
        if (bat) m.add(n.id)
        else m.delete(n.id)
      }
      return m
    })

  return (
    <div>
      {nhom.length > 0 && !hangDoi && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="🔍 Tìm nhóm theo tên, ví dụ: công nghệ"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-chinh focus:outline-none"
          />
          {/* Gợi ý nhanh: các từ hay gặp trong tên nhóm */}
          {tuGoiY(nhom).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTuKhoa(tuKhoa === t ? '' : t)}
              className={`rounded-full px-2.5 py-1 text-xs ${tuKhoa === t ? 'bg-chinh text-white' : 'bg-slate-100 text-phu hover:bg-slate-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {bai && nhom.length > 0 && (
        <div className="sticky top-0 z-10 mt-3 rounded-xl border border-chinh/30 bg-blue-50 p-3">
          {dangDang ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">
                Đang đăng ({viTri + 1}/{hangDoi!.length}): {dangDang.ten}
              </span>
              <span className="w-full text-xs text-phu">Bài đã được chép. Trong tab nhóm vừa mở: bấm vào ô viết bài → Ctrl+V → thêm ảnh → Đăng. Xong quay lại đây.</span>
              <button onClick={() => tiep(true)} className="rounded-md bg-green-600 px-3 py-1.5 font-semibold text-white hover:bg-green-700">
                ✓ Đã đăng{viTri + 1 < hangDoi!.length ? ' → nhóm tiếp' : ' (xong)'}
              </button>
              <button onClick={() => tiep(false)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">
                Bỏ qua
              </button>
              <button onClick={() => chepVaMo(bai.noiDung, dangDang.link)} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">
                Chép & mở lại
              </button>
              <button onClick={() => setHangDoi(null)} className="ml-auto text-phu hover:underline">
                Dừng
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={daChonHet} onChange={(e) => chonKetQua(e.target.checked)} />
                {tk ? `Chọn tất cả ${hienThi.length} kết quả` : 'Chọn tất cả'}
              </label>
              <button onClick={() => setChon(new Set(hienThi.filter((n) => !n.daDangBaiNay).map((n) => n.id)))} className="text-chinh hover:underline">
                Chỉ chọn nhóm chưa đăng bài này
              </button>
              {chon.size > 0 && (
                <button onClick={() => setChon(new Set())} className="text-phu hover:underline">
                  Bỏ chọn hết
                </button>
              )}
              <button
                onClick={batDau}
                disabled={!chon.size}
                className="ml-auto rounded-md bg-chinh px-3 py-1.5 font-semibold text-white hover:bg-chinh-dam disabled:opacity-50"
              >
                Đăng lần lượt {chon.size} nhóm đã chọn
              </button>
            </div>
          )}
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {!nhom.length && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-phu">
            <b className="text-chu">Chưa có nhóm nào.</b> Facebook không cho phần mềm tự đọc danh sách nhóm bạn đã tham gia, nên cần dán link nhóm một lần ở ô
            “Thêm nhóm đã tham gia”. Sau đó các nhóm hiện ở đây kèm ô tích chọn và ô tìm theo tên (ví dụ “công nghệ”).
          </li>
        )}
        {nhom.length > 0 && !hienThi.length && <li className="text-sm text-phu">Không có nhóm nào có chữ “{tuKhoa}”.</li>}
        {hienThi.map((n) => (
          <li
            key={n.id}
            className={`flex items-start gap-3 rounded-xl border bg-white p-3 ${dangDang?.id === n.id ? 'border-chinh ring-2 ring-chinh/30' : 'border-slate-200'}`}
          >
            <input type="checkbox" checked={chon.has(n.id)} onChange={() => doiChon(n.id)} disabled={!!hangDoi} className="mt-1" aria-label={`Chọn ${n.ten}`} />
            <div className="min-w-0 flex-1">
              <a href={n.link} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                {n.ten}
              </a>
              {n.ghi_chu && <p className="text-xs text-phu">{n.ghi_chu}</p>}
              <p className="mt-0.5 text-xs text-phu">
                {n.daDangBaiNay ? <span className="font-semibold text-green-700">✓ Đã đăng bài này {ngay(n.daDangBaiNay)}</span> : 'Chưa đăng bài này'}
                {n.lanCuoi && ` · Gần nhất ${ngay(n.lanCuoi)}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
              {bai && !hangDoi && (
                <button onClick={() => chepVaMo(bai.noiDung, n.link)} className="rounded-md border border-chinh px-2 py-1 font-semibold text-chinh hover:bg-chinh/5">
                  Chép & mở
                </button>
              )}
              {bai && !hangDoi && (
                <button onClick={() => chay(() => danhDauDaDangNhom(n.id, bai.id))} className="text-green-700 hover:underline">
                  ✓ Đánh dấu đã đăng
                </button>
              )}
              <NutHanhDong chay={xoaNhom.bind(null, n.id)} xacNhan={`Xóa nhóm ${n.ten}?`} className="text-red-600 hover:underline">
                Xóa
              </NutHanhDong>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
