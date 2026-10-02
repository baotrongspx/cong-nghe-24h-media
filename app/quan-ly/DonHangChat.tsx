'use client'

import { useState, useTransition } from 'react'
import { DS_TRANG_THAI, TRANG_THAI_DON, docTien, tien, tongDon, type DonHang, type TrangThaiDon } from '@/lib/donHang'
import { guiXacNhanDon } from './actions'
import { doiTrangThaiDon, luuDon } from './don-hang/actions'

type Dong = { ten: string; sl: string; gia: string }
type MacDinh = { khach_ten: string; so_dien_thoai: string; dia_chi: string }

const dongTrong = (): Dong => ({ ten: '', sl: '1', gia: '' })
const oNhap = 'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-chinh focus:outline-none'

// Nút "Đơn hàng" trên đầu hội thoại: mở ngăn bên phải để tạo / sửa / gửi xác nhận đơn
export default function DonHangChat({
  hoiThoaiId,
  macDinh,
  don,
  goiYSanPham,
}: {
  hoiThoaiId: string
  macDinh: MacDinh
  don: DonHang[]
  goiYSanPham: { ten: string; gia: number }[]
}) {
  const [mo, setMo] = useState(false)
  // null: xem danh sách; 'moi': tạo đơn; DonHang: đang sửa đơn đó
  const [dangSoan, setDangSoan] = useState<DonHang | 'moi' | null>(null)
  const moNgan = () => {
    setMo(true)
    setDangSoan(don.length ? null : 'moi')
  }
  return (
    <>
      <button onClick={moNgan} className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50">
        🧾 Đơn{don.length ? ` (${don.length})` : ''}
      </button>
      {mo && (
        <div className="fixed inset-0 z-30 flex justify-end bg-slate-900/20" onClick={() => setMo(false)}>
          <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              {dangSoan && don.length > 0 && (
                <button onClick={() => setDangSoan(null)} className="text-chinh" aria-label="Quay lại danh sách đơn">
                  ←
                </button>
              )}
              <h2 className="font-semibold">
                {dangSoan === 'moi' ? 'Tạo đơn hàng' : dangSoan ? `Sửa đơn #${dangSoan.ma}` : 'Đơn hàng của khách'}
              </h2>
              <button onClick={() => setMo(false)} className="ml-auto rounded px-2 text-xl text-phu hover:bg-slate-100" aria-label="Đóng">
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {dangSoan ? (
                <FormDon
                  key={dangSoan === 'moi' ? 'moi' : dangSoan.id}
                  hoiThoaiId={hoiThoaiId}
                  macDinh={macDinh}
                  don={dangSoan === 'moi' ? null : dangSoan}
                  goiYSanPham={goiYSanPham}
                  xong={() => setDangSoan(null)}
                />
              ) : (
                <DanhSachDon don={don} sua={setDangSoan} taoMoi={() => setDangSoan('moi')} />
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function DanhSachDon({ don, sua, taoMoi }: { don: DonHang[]; sua: (d: DonHang) => void; taoMoi: () => void }) {
  return (
    <div className="space-y-3">
      <button onClick={taoMoi} className="w-full rounded-lg bg-chinh px-4 py-2 font-semibold text-white hover:bg-chinh-dam">
        + Tạo đơn mới
      </button>
      {don.map((d) => (
        <TheDon key={d.id} d={d} sua={() => sua(d)} />
      ))}
    </div>
  )
}

function TheDon({ d, sua }: { d: DonHang; sua: () => void }) {
  const [dang, chay] = useTransition()
  const [thongBao, setThongBao] = useState<{ ok: boolean; chu: string } | null>(null)
  return (
    <div className={`rounded-xl border border-slate-200 p-3 text-sm ${dang ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="font-semibold">#{d.ma}</span>
        <select
          value={d.trang_thai}
          disabled={dang}
          onChange={(e) => chay(() => doiTrangThaiDon(d.id, e.target.value as TrangThaiDon))}
          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TRANG_THAI_DON[d.trang_thai][1]}`}
        >
          {DS_TRANG_THAI.map((t) => (
            <option key={t} value={t}>
              {TRANG_THAI_DON[t][0]}
            </option>
          ))}
        </select>
        <span className="ml-auto font-semibold">{tien(d.tong)}</span>
      </div>
      <ul className="mt-2 space-y-0.5 text-phu">
        {d.san_pham.map((x, i) => (
          <li key={i}>
            {x.ten} × {x.sl}
          </li>
        ))}
      </ul>
      {d.dia_chi && <p className="mt-1 text-phu">📍 {d.dia_chi}</p>}
      <div className="mt-2 flex gap-3">
        <button onClick={sua} className="text-chinh hover:underline">
          Sửa
        </button>
        <button
          disabled={dang}
          onClick={() =>
            chay(async () => {
              const r = await guiXacNhanDon(d.id)
              setThongBao(r.ok ? { ok: true, chu: 'Đã gửi cho khách' } : { ok: false, chu: r.thongBao ?? 'Gửi lỗi' })
            })
          }
          className="text-chinh hover:underline"
        >
          📨 Gửi xác nhận cho khách
        </button>
      </div>
      {thongBao && <p className={`mt-1 ${thongBao.ok ? 'text-green-700' : 'text-red-600'}`}>{thongBao.chu}</p>}
    </div>
  )
}

function FormDon({
  hoiThoaiId,
  macDinh,
  don,
  goiYSanPham,
  xong,
}: {
  hoiThoaiId: string
  macDinh: MacDinh
  don: DonHang | null
  goiYSanPham: { ten: string; gia: number }[]
  xong: () => void
}) {
  const goc = don ?? macDinh
  const [khach, setKhach] = useState<MacDinh>({ khach_ten: goc.khach_ten, so_dien_thoai: goc.so_dien_thoai, dia_chi: goc.dia_chi })
  const [dong, setDong] = useState<Dong[]>(don ? don.san_pham.map((x) => ({ ten: x.ten, sl: String(x.sl), gia: String(x.gia) })) : [dongTrong()])
  const [ship, setShip] = useState(don?.phi_ship ? String(don.phi_ship) : '')
  const [giam, setGiam] = useState(don?.giam_gia ? String(don.giam_gia) : '')
  const [ghiChu, setGhiChu] = useState(don?.ghi_chu ?? '')
  const [loi, setLoi] = useState('')
  const [dang, chay] = useTransition()

  const giaGoiY = new Map(goiYSanPham.map((x) => [x.ten.toLowerCase(), x.gia]))
  const sanPham = dong
    .filter((x) => x.ten.trim())
    .map((x) => ({ ten: x.ten.trim(), sl: Math.max(1, Math.floor(Number(x.sl)) || 1), gia: docTien(x.gia) }))
  const tong = tongDon({ san_pham: sanPham, phi_ship: docTien(ship), giam_gia: docTien(giam) })

  const suaDong = (i: number, doi: Partial<Dong>) =>
    setDong((ds) =>
      ds.map((x, j) => {
        if (j !== i) return x
        const moi = { ...x, ...doi }
        // Chọn sản phẩm đã bán trước đây: tự điền giá cũ
        if (doi.ten !== undefined && !x.gia) {
          const g = giaGoiY.get(doi.ten.trim().toLowerCase())
          if (g) moi.gia = String(g)
        }
        return moi
      }),
    )

  const luu = () =>
    chay(async () => {
      const r = await luuDon({
        id: don?.id,
        hoi_thoai_id: hoiThoaiId,
        ...khach,
        san_pham: sanPham,
        phi_ship: docTien(ship),
        giam_gia: docTien(giam),
        ghi_chu: ghiChu,
      })
      if (r.ok) xong()
      else setLoi(r.thongBao ?? 'Lưu đơn lỗi')
    })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        luu()
      }}
      className="space-y-4 text-sm"
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">Sản phẩm</legend>
        <datalist id="goi-y-san-pham">
          {goiYSanPham.map((x) => (
            <option key={x.ten} value={x.ten} />
          ))}
        </datalist>
        {dong.map((x, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={x.ten}
              onChange={(e) => suaDong(i, { ten: e.target.value })}
              list="goi-y-san-pham"
              placeholder="Tên sản phẩm"
              aria-label="Tên sản phẩm"
              className={`${oNhap} min-w-0 flex-1`}
            />
            <input
              value={x.sl}
              onChange={(e) => suaDong(i, { sl: e.target.value.replace(/\D/g, '') })}
              inputMode="numeric"
              aria-label="Số lượng"
              className={`${oNhap} w-12 text-center`}
            />
            <input
              value={x.gia}
              onChange={(e) => suaDong(i, { gia: e.target.value })}
              placeholder="Giá"
              aria-label="Đơn giá"
              title="Gõ 150k, 1tr2 hoặc 150000"
              className={`${oNhap} w-24 text-right`}
            />
            <button
              type="button"
              onClick={() => setDong((ds) => (ds.length > 1 ? ds.filter((_, j) => j !== i) : [dongTrong()]))}
              className="px-1 text-phu hover:text-red-600"
              aria-label="Xóa dòng"
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setDong((ds) => [...ds, dongTrong()])} className="text-chinh hover:underline">
          + Thêm sản phẩm
        </button>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="text-phu">Phí ship</span>
          <input value={ship} onChange={(e) => setShip(e.target.value)} placeholder="30k" className={`${oNhap} mt-0.5 text-right`} />
        </label>
        <label>
          <span className="text-phu">Giảm giá</span>
          <input value={giam} onChange={(e) => setGiam(e.target.value)} placeholder="0" className={`${oNhap} mt-0.5 text-right`} />
        </label>
      </div>
      <p className="flex items-baseline justify-between rounded-lg bg-nen px-3 py-2">
        <span className="text-phu">Tổng thanh toán</span>
        <span className="text-lg font-bold text-chinh">{tien(tong)}</span>
      </p>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">Người nhận</legend>
        <input value={khach.khach_ten} onChange={(e) => setKhach({ ...khach, khach_ten: e.target.value })} placeholder="Tên khách" aria-label="Tên khách" className={oNhap} />
        <input
          value={khach.so_dien_thoai}
          onChange={(e) => setKhach({ ...khach, so_dien_thoai: e.target.value })}
          inputMode="tel"
          placeholder="Số điện thoại"
          aria-label="Số điện thoại"
          className={oNhap}
        />
        <textarea
          value={khach.dia_chi}
          onChange={(e) => setKhach({ ...khach, dia_chi: e.target.value })}
          rows={2}
          placeholder="Địa chỉ giao hàng"
          aria-label="Địa chỉ giao hàng"
          className={`${oNhap} resize-none`}
        />
        <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} rows={2} placeholder="Ghi chú (màu, size, giờ giao…)" aria-label="Ghi chú" className={`${oNhap} resize-none`} />
      </fieldset>

      {loi && <p className="text-red-600">{loi}</p>}
      <button disabled={dang || !sanPham.length} className="w-full rounded-lg bg-chinh px-4 py-2.5 font-semibold text-white hover:bg-chinh-dam disabled:opacity-50">
        {dang ? 'Đang lưu…' : don ? 'Lưu thay đổi' : 'Tạo đơn'}
      </button>
    </form>
  )
}
