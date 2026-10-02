'use client'

import { useActionState, useState, useTransition } from 'react'
import { danhDauDaDangNhom, themNhieuNhom, xoaNhom } from '../dang-bai/actions'
import { NutHanhDong } from '../NutHanhDong'

export type Nhom = { id: string; ten: string; link: string; ghi_chu: string | null; daDangBaiNay: string | null; lanCuoi: string | null }

const ngay = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Chép bài và mở nhóm trong cùng một cú bấm (trình duyệt chỉ cho mở tab mới khi người dùng bấm)
function chepVaMo(noiDung: string, link: string) {
  navigator.clipboard.writeText(noiDung).catch(() => {})
  window.open(link, '_blank', 'noopener')
}

export function FormThemNhieuNhom() {
  const [kq, gui, dang] = useActionState(themNhieuNhom, null)
  return (
    <form action={gui} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-semibold">Thêm nhóm đã tham gia</p>
      <p className="text-xs text-phu">
        Mở{' '}
        <a href="https://www.facebook.com/groups/joins/" target="_blank" rel="noreferrer" className="text-chinh underline">
          danh sách nhóm của bạn
        </a>{' '}
        trên Facebook, chuột phải vào tên nhóm → Sao chép địa chỉ liên kết, rồi dán vào đây. Mỗi dòng một nhóm, có thể ghi tên trước: <i>Tên nhóm | link</i>. Link trùng tự bỏ qua.
      </p>
      <textarea
        name="danh_sach"
        rows={5}
        required
        placeholder={'https://www.facebook.com/groups/chothanhlyhanoi\nHội mẹ bỉm sữa | https://www.facebook.com/groups/123456789'}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button disabled={dang} className="justify-self-start rounded-lg bg-chinh px-4 py-2 text-sm font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
        {dang ? 'Đang thêm…' : 'Thêm các nhóm'}
      </button>
      {kq && <p className={`text-sm ${kq.ok ? 'text-green-700' : 'text-red-600'}`}>{kq.thongBao}</p>}
    </form>
  )
}

export default function DanhSachNhom({ nhom, bai }: { nhom: Nhom[]; bai: { id: string; noiDung: string } | null }) {
  const [chon, setChon] = useState<Set<string>>(new Set())
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

  return (
    <div>
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
                <input
                  type="checkbox"
                  checked={chon.size === nhom.length}
                  onChange={(e) => setChon(e.target.checked ? new Set(nhom.map((n) => n.id)) : new Set())}
                />
                Chọn tất cả
              </label>
              <button onClick={() => setChon(new Set(nhom.filter((n) => !n.daDangBaiNay).map((n) => n.id)))} className="text-chinh hover:underline">
                Chọn nhóm chưa đăng bài này
              </button>
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
        {!nhom.length && <li className="text-sm text-phu">Chưa có nhóm nào. Dán link các nhóm bạn đã tham gia ở cột bên trái.</li>}
        {nhom.map((n) => (
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
